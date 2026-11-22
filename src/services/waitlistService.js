const Appointment = require('../models/appointmentModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const Waitlist = require('../models/waitlistModel');
const AppointmentService = require('./appointmentService');
const { getSlotRuleViolations } = require('../validators/slotValidator');
const { writeAuditEntry } = require('../utils/auditLogger');
const { formatSqlDateTime, parseLocalDateTime, dayBounds } = require('../utils/dateTime');
const { DAILY_APPOINTMENT_CAP } = require('../config/businessRules');
const { NotFoundError, ConflictError, UnprocessableError } = require('../utils/errors');

const PROMOTION = Object.freeze({
  PROMOTED: 'PROMOTED',
  REQUEUED: 'REQUEUED',
  DROPPED: 'DROPPED',
  EMPTY: 'EMPTY',
  SLOT_NOT_BOOKABLE: 'SLOT_NOT_BOOKABLE',
});

async function joinWaitlist({ patientId, doctorId, slotStart }) {
  const [doctor, patient] = await Promise.all([Doctor.findById(doctorId), Patient.findById(patientId)]);
  if (!doctor) throw new NotFoundError('Doctor');
  if (!patient) throw new NotFoundError('Patient');

  const slot = formatSqlDateTime(slotStart);
  const [dayStart, nextDayStart] = dayBounds(slotStart);

  let scope;
  if (await Appointment.isSlotBooked(doctorId, slot)) {
    scope = 'SLOT';
  } else if ((await Appointment.countBookedForDoctorBetween(doctorId, dayStart, nextDayStart)) >= DAILY_APPOINTMENT_CAP) {
    scope = 'DAY';
  } else {
    throw new UnprocessableError('This slot is available, so book it directly instead of joining the waitlist');
  }

  const key = scope === 'SLOT' ? Waitlist.slotKey(doctorId, slot) : Waitlist.dayKey(doctorId, slot);
  const position = await Waitlist.add(key, { patientId, doctorId, slotStart: slot });
  if (position === null) throw new ConflictError('Patient is already on this waitlist');

  writeAuditEntry('WAITLIST_JOINED', { patient_id: patientId, doctor_id: doctorId, slot_start: slot, scope, position });
  return { scope, position, patient_id: patientId, doctor_id: doctorId, slot_start: slot };
}

async function getWaitlist(doctorId, slotStart) {
  const slot = formatSqlDateTime(slotStart);
  const [slotEntries, dayEntries] = await Promise.all([
    Waitlist.listEntries(Waitlist.slotKey(doctorId, slot)),
    Waitlist.listEntries(Waitlist.dayKey(doctorId, slot)),
  ]);
  return { doctor_id: doctorId, slot_start: slot, slot_waitlist: slotEntries, day_waitlist: dayEntries };
}

async function tryPromote(rawEntry, slotDate) {
  const entry = JSON.parse(rawEntry);
  const context = { patient_id: entry.patient_id, doctor_id: entry.doctor_id, waitlist: entry.key };

  try {
    const appointment = await AppointmentService.bookAppointment({
      patientId: entry.patient_id,
      doctorId: entry.doctor_id,
      slotStart: slotDate,
    });
    await Waitlist.complete(rawEntry);
    await writeAuditEntry('WAITLIST_PROMOTED', { ...context, appointment_id: appointment.id, slot_start: appointment.slot_start });
    return PROMOTION.PROMOTED;
  } catch (err) {
    if (err instanceof NotFoundError) {
      await Waitlist.complete(rawEntry);
      await writeAuditEntry('WAITLIST_ENTRY_DROPPED', { ...context, reason: err.message });
      return PROMOTION.DROPPED;
    }

    await Waitlist.release(rawEntry);
    if (err instanceof ConflictError) {
      await writeAuditEntry('WAITLIST_PROMOTION_FAILED', { ...context, reason: err.message, requeued: true });
      return PROMOTION.REQUEUED;
    }
    throw err;
  }
}

async function promoteNextPatient({ doctorId, slotStart }) {
  const slotDate = parseLocalDateTime(slotStart);
  if (getSlotRuleViolations(slotDate, new Date()).length > 0) return PROMOTION.SLOT_NOT_BOOKABLE;

  for (const key of [Waitlist.slotKey(doctorId, slotStart), Waitlist.dayKey(doctorId, slotStart)]) {
    let rawEntry = await Waitlist.claimNext(key);
    while (rawEntry !== null) {
      const outcome = await tryPromote(rawEntry, slotDate);
      if (outcome !== PROMOTION.DROPPED) return outcome;
      rawEntry = await Waitlist.claimNext(key);
    }
  }
  return PROMOTION.EMPTY;
}

module.exports = { joinWaitlist, getWaitlist, promoteNextPatient };
