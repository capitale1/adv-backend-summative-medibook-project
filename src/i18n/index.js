const en = require('../../locales/en.json');
const fr = require('../../locales/fr.json');

const DEFAULT_LANGUAGE = 'en';
const LOCALES = Object.freeze({ en, fr });

function resolveLanguage(requested) {
  const code = typeof requested === 'string' ? requested.trim().toLowerCase() : '';
  return Object.hasOwn(LOCALES, code) ? code : DEFAULT_LANGUAGE;
}

function getLocale(requested) {
  const language = resolveLanguage(requested);
  return { language, messages: LOCALES[language] };
}

function formatLocalDate(date, messages) {
  return new Intl.DateTimeFormat(messages.intlLocale, { dateStyle: 'full' }).format(date);
}

function availableLanguages() {
  return Object.entries(LOCALES).map(([code, messages]) => ({ code, name: messages.languageName }));
}

module.exports = { DEFAULT_LANGUAGE, resolveLanguage, getLocale, formatLocalDate, availableLanguages };
