const { getLocale, formatLocalDate, availableLanguages } = require('../i18n');
const { renderFeedbackForm, renderThankYou } = require('../views/feedbackPage');

function showFeedbackForm(req, res) {
  const { language, messages } = getLocale(req.query.lang);
  res.type('html').send(
    renderFeedbackForm({
      language,
      messages,
      formattedDate: formatLocalDate(new Date(), messages),
      languages: availableLanguages(),
    })
  );
}

function submitFeedback(req, res) {
  const { language, messages } = getLocale(req.query.lang);
  res.type('html').send(renderThankYou({ language, messages, languages: availableLanguages() }));
}

module.exports = { showFeedbackForm, submitFeedback };
