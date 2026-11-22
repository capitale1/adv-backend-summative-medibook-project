const { SLOT_MINUTES, WORKDAY_START_MINUTES, WORKDAY_END_MINUTES } = require('../config/businessRules');

function getSlotRuleViolations(slotStart, now) {
  const violations = [];

  if (slotStart.getTime() <= now.getTime()) {
    violations.push('Appointments can only be booked in the future');
  }

  if (slotStart.getMinutes() % SLOT_MINUTES !== 0 || slotStart.getSeconds() !== 0 || slotStart.getMilliseconds() !== 0) {
    violations.push(`slot_start must be on a ${SLOT_MINUTES}-minute boundary (e.g. 09:00 or 09:30)`);
  }

  const startMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  if (startMinutes < WORKDAY_START_MINUTES || startMinutes + SLOT_MINUTES > WORKDAY_END_MINUTES) {
    violations.push('slot_start must be within working hours (first slot 09:00, last slot 16:30)');
  }

  return violations;
}

module.exports = { getSlotRuleViolations };
