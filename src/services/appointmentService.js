const Appointment = require('../models/appointmentModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const { withTransaction } = require('../models/transaction');
const { calculateRefund } = require('./refundCalculator');
const { writeAuditEntry } = require('../utils/auditLogger');
const { enqueueConfirmation, enqueueWaitlistPromotion } = require('../queues/appointmentQueue');
const { formatSqlDateTime, parseLocalDateTime, dayBounds } = require('../utils/dateTime');
const { DAILY_APPOINTMENT_CAP } = require('../config/businessRules');
const { NotFoundError, ConflictError, UnprocessableError } = require('../utils/errors');

const DUPLICATE_KEY = 'ER_DUP_ENTRY';

function waitlistOffer(reason, patientId, doctorId, slot) {
  return {
    reason,
    waitlist: {
      message: 'You can join the waitlist and be booked automatically if a slot frees up',
      method: 'POST',
      url: '/api/waitlist',
      body: { patient_id: patientId, doctor_id: doctorId, slot_start: slot },
    },
  };
}

async function bookAppointment({ patientId, doctorId, slotStart }) {
  const slot = formatSqlDateTime(slotStart);

  const appointment = await withTransaction(async (connection) => {
    const doctor = await Doctor.findByIdForUpdate(connection, doctorId);
    if (!doctor) throw new NotFoundError('Doctor');

    const patient = await Patient.findById(patientId, connection);
    if (!patient) throw new NotFoundError('Patient');

    const [dayStart, nextDayStart] = dayBounds(slotStart);
    const bookedThatDay = await Appointment.countBookedForDoctorBetween(doctorId, dayStart, nextDayStart, connection);
    if (bookedThatDay >= DAILY_APPOINTMENT_CAP) {
      throw new ConflictError(
        `Doctor is fully booked on this day (${DAILY_APPOINTMENT_CAP} appointments)`,
        waitlistOffer('DAY_FULL', patientId, doctorId, slot)
      );
    }

    let appointmentId;
    try {
      appointmentId = await Appointment.insert(connection, {
        patientId,
        doctorId,
        slotStart: slot,
        amountPaid: doctor.consultation_fee,
      });
    } catch (err) {
      if (err.code === DUPLICATE_KEY) {
        throw new ConflictError(
          'This slot is already booked for this doctor',
          waitlistOffer('SLOT_TAKEN', patientId, doctorId, slot)
        );
      }
      throw err;
    }

    return Appointment.findById(appointmentId, connection);
  });

  writeAuditEntry('APPOINTMENT_BOOKED', {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    slot_start: appointment.slot_start,
    amount_paid: appointment.amount_paid,
  });
  enqueueConfirmation(appointment.id);

  return appointment;
}

async function getAppointment(id) {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError('Appointment');
  return appointment;
}

async function cancelAppointment(id, now = new Date()) {
  const result = await withTransaction(async (connection) => {
    const appointment = await Appointment.findByIdForUpdate(connection, id);
    if (!appointment) throw new NotFoundError('Appointment');
    if (appointment.status === 'CANCELLED') {
      throw new ConflictError('Appointment is already cancelled');
    }

    const slotStart = parseLocalDateTime(appointment.slot_start);
    if (slotStart.getTime() <= now.getTime()) {
      throw new UnprocessableError('Appointments that have already started cannot be cancelled');
    }

    const refund = calculateRefund(appointment.amount_paid, slotStart, now);
    await Appointment.markCancelled(connection, id, formatSqlDateTime(now), refund.amount);

    return { appointment: await Appointment.findById(id, connection), refund };
  });

  const { appointment, refund } = result;
  writeAuditEntry('APPOINTMENT_CANCELLED', {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    slot_start: appointment.slot_start,
    refund_percent: refund.percent,
    refund_amount: refund.amount,
  });
  enqueueWaitlistPromotion(appointment.doctor_id, appointment.slot_start);

  return result;
}

module.exports = { bookAppointment, getAppointment, cancelAppointment };
