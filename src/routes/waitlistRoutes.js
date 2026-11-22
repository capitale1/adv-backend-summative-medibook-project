const { Router } = require('express');
const controller = require('../controllers/waitlistController');

const router = Router();

router.route('/')
  .get(controller.getWaitlist)
  .post(controller.joinWaitlist);

module.exports = router;
