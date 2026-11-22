const { Router } = require('express');
const controller = require('../controllers/appointmentController');

const router = Router();

router.post('/', controller.bookAppointment);

router.route('/:id')
  .get(controller.getAppointment)
  .delete(controller.cancelAppointment);

module.exports = router;
