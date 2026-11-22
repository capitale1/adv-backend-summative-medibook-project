const AppointmentService = require('../services/appointmentService');
const { validateBookingRequest, toBookingData } = require('../validators/appointmentValidator');
const { getSlotRuleViolations } = require('../validators/slotValidator');
const { requireId } = require('../validators/common');
const { ValidationError, UnprocessableError } = require('../utils/errors');

async function bookAppointment(req, res) {
  const errors = validateBookingRequest(req.body);
  if (errors.length > 0) throw new ValidationError(errors);

  const booking = toBookingData(req.body);
  const violations = getSlotRuleViolations(booking.slotStart, new Date());
  if (violations.length > 0) throw new UnprocessableError('Slot violates booking rules', violations);

  const appointment = await AppointmentService.bookAppointment(booking);
  res.status(201).location(`/api/appointments/${appointment.id}`).json(appointment);
}

async function getAppointment(req, res) {
  res.json(await AppointmentService.getAppointment(requireId(req.params.id)));
}

async function cancelAppointment(req, res) {
  const { appointment, refund } = await AppointmentService.cancelAppointment(requireId(req.params.id));
  res.json({
    message: `Appointment cancelled. Refund: ${refund.amount.toFixed(2)} (${refund.percent}%)`,
    appointment,
    refund,
  });
}

module.exports = { bookAppointment, getAppointment, cancelAppointment };
