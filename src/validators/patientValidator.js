const { isNonEmptyString } = require('./common');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,18}$/;

function validatePatient(body) {
  if (!body || typeof body !== 'object') return ['Request body must be a JSON object'];

  const errors = [];
  if (!isNonEmptyString(body.full_name, 100)) {
    errors.push('full_name is required (max 100 characters)');
  }
  if (typeof body.email !== 'string' || body.email.length > 150 || !EMAIL_PATTERN.test(body.email.trim())) {
    errors.push('email must be a valid email address');
  }
  if (typeof body.phone !== 'string' || !PHONE_PATTERN.test(body.phone.trim())) {
    errors.push('phone must be 7-19 characters of digits, spaces or dashes (optional leading +)');
  }
  return errors;
}

function toPatientData(body) {
  return {
    full_name: body.full_name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
  };
}

module.exports = { validatePatient, toPatientData };
