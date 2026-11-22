const WaitlistService = require('../services/waitlistService');
const { parseSlotRequest } = require('./requestParsers');
const { parseId } = require('../validators/common');
const { parseLocalDateTime } = require('../utils/dateTime');
const { ValidationError } = require('../utils/errors');

async function joinWaitlist(req, res) {
  const entry = await WaitlistService.joinWaitlist(parseSlotRequest(req.body));
  res.status(201).json({
    message: `Added to the waitlist at position ${entry.position}`,
    ...entry,
  });
}

async function getWaitlist(req, res) {
  const doctorId = parseId(req.query.doctor_id);
  const slotStart = parseLocalDateTime(req.query.slot_start);
  const errors = [];
  if (doctorId === null) errors.push('doctor_id query parameter must be a positive integer');
  if (slotStart === null) errors.push("slot_start query parameter must be 'YYYY-MM-DD HH:MM'");
  if (errors.length > 0) throw new ValidationError(errors);

  res.json(await WaitlistService.getWaitlist(doctorId, slotStart));
}

module.exports = { joinWaitlist, getWaitlist };
