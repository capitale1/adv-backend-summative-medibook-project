const { isNonEmptyString } = require('./common');

const MAX_FEE = 99999999.99;

function hasAtMostTwoDecimals(value) {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

function validateDoctor(body) {
  if (!body || typeof body !== 'object') return ['Request body must be a JSON object'];

  const errors = [];
  if (!isNonEmptyString(body.full_name, 100)) {
    errors.push('full_name is required (max 100 characters)');
  }
  if (!isNonEmptyString(body.specialty, 100)) {
    errors.push('specialty is required (max 100 characters)');
  }
  const fee = body.consultation_fee;
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0 || fee > MAX_FEE || !hasAtMostTwoDecimals(fee)) {
    errors.push('consultation_fee must be a non-negative number with at most 2 decimal places');
  }
  if (!isNonEmptyString(body.room, 10)) {
    errors.push('room is required (max 10 characters)');
  }
  return errors;
}

function toDoctorData(body) {
  return {
    full_name: body.full_name.trim(),
    specialty: body.specialty.trim(),
    consultation_fee: body.consultation_fee,
    room: body.room.trim(),
  };
}

module.exports = { validateDoctor, toDoctorData };
