const { Router } = require('express');
const controller = require('../controllers/feedbackController');

const router = Router();

router.route('/')
  .get(controller.showFeedbackForm)
  .post(controller.submitFeedback);

module.exports = router;
