const { Router } = require('express');
const controller = require('../controllers/reportController');

const router = Router();

router.get('/doctors', controller.getDoctorsReport);
router.get('/busy-days', controller.getBusyDaysReport);

module.exports = router;
