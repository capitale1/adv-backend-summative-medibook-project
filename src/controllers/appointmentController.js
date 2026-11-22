const AppointmentService = require('../services/appointmentService');
const { parseSlotRequest } = require('./requestParsers');
const { requireId } = require('../validators/common');

async function bookAppointment(req, res) {
  const appointment = await AppointmentService.bookAppointment(parseSlotRequest(req.body));
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
