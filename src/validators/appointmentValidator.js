const { parseId } = require('./common');
const { parseLocalDateTime } = require('../utils/dateTime');

function validateSlotRequest(body) {
  if (!body || typeof body !== 'object') return ['Request body must be a JSON object'];

  const errors = [];
  if (typeof body.patient_id !== 'number' || parseId(body.patient_id) === null) {
    errors.push('patient_id must be a positive integer');
  }
  if (typeof body.doctor_id !== 'number' || parseId(body.doctor_id) === null) {
    errors.push('doctor_id must be a positive integer');
  }
  if (parseLocalDateTime(body.slot_start) === null) {
    errors.push("slot_start must be a valid date-time in the format 'YYYY-MM-DD HH:MM'");
  }
  return errors;
}

function toSlotRequest(body) {
  return {
    patientId: body.patient_id,
    doctorId: body.doctor_id,
    slotStart: parseLocalDateTime(body.slot_start),
  };
}

module.exports = { validateSlotRequest, toSlotRequest };
