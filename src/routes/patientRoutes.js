const { Router } = require('express');
const controller = require('../controllers/patientController');

const router = Router();

router.route('/')
  .get(controller.listPatients)
  .post(controller.createPatient);

router.route('/:id')
  .get(controller.getPatient)
  .put(controller.updatePatient)
  .delete(controller.deletePatient);

module.exports = router;
