const { validateSlotRequest, toSlotRequest } = require('../validators/appointmentValidator');
const { getSlotRuleViolations } = require('../validators/slotValidator');
const { ValidationError, UnprocessableError } = require('../utils/errors');

function parseSlotRequest(body) {
  const errors = validateSlotRequest(body);
  if (errors.length > 0) throw new ValidationError(errors);

  const request = toSlotRequest(body);
  const violations = getSlotRuleViolations(request.slotStart, new Date());
  if (violations.length > 0) throw new UnprocessableError('Slot violates booking rules', violations);

  return request;
}

module.exports = { parseSlotRequest };
