const { parseId } = require('./common');
const { parseLocalDateTime } = require('../utils/dateTime');

function validateBookingRequest(body) {
  if (!body || typeof body !== 'object') return ['Request body must be a JSON object'];

  const errors = [];
  if (parseId(body.patient_id) === null || typeof body.patient_id !== 'number') {
    errors.push('patient_id must be a positive integer');
  }
  if (parseId(body.doctor_id) === null || typeof body.doctor_id !== 'number') {
    errors.push('doctor_id must be a positive integer');
  }
  if (parseLocalDateTime(body.slot_start) === null) {
    errors.push("slot_start must be a valid date-time in the format 'YYYY-MM-DD HH:MM'");
  }
  return errors;
}

function toBookingData(body) {
  return {
    patientId: body.patient_id,
    doctorId: body.doctor_id,
    slotStart: parseLocalDateTime(body.slot_start),
  };
}

module.exports = { validateBookingRequest, toBookingData };
