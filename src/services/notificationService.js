const Appointment = require('../models/appointmentModel');
const { writeAuditEntry } = require('../utils/auditLogger');

async function sendConfirmation(appointmentId) {
  const details = await Appointment.findDetailsById(appointmentId);
  if (!details || details.status !== 'BOOKED') {
    await writeAuditEntry('CONFIRMATION_SKIPPED', { appointment_id: appointmentId, reason: 'Appointment not active' });
    return;
  }

  const message =
    `Hello ${details.patient_name}, your appointment with ${details.doctor_name} (${details.specialty}) ` +
    `is confirmed for ${details.slot_start.slice(0, 16)} in room ${details.room}.`;

  await writeAuditEntry('CONFIRMATION_SENT', {
    appointment_id: details.id,
    patient_id: details.patient_id,
    channels: { sms: details.patient_phone, email: details.patient_email },
    message,
  });
}

module.exports = { sendConfirmation };
