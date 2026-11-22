const { ValidationError } = require('../utils/errors');

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requireId(value) {
  const id = parseId(value);
  if (id === null) throw new ValidationError(['id must be a positive integer']);
  return id;
}

module.exports = { isNonEmptyString, parseId, requireId };
