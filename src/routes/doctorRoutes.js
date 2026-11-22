const { Router } = require('express');
const controller = require('../controllers/doctorController');

const router = Router();

router.route('/')
  .get(controller.listDoctors)
  .post(controller.createDoctor);

router.route('/:id')
  .get(controller.getDoctor)
  .put(controller.updateDoctor)
  .delete(controller.deleteDoctor);

module.exports = router;
