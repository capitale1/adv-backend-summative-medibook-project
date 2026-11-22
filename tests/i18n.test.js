const { resolveLanguage, getLocale, formatLocalDate } = require('../src/i18n');

describe('feedback page localisation', () => {
  test('uses French when lang=fr', () => {
    expect(getLocale('fr').messages.title).toBe('Évaluation du cours');
  });

  test.each([undefined, 'de', '', ['fr', 'en'], 'FR '])('resolves %p safely', (value) => {
    const expected = value === 'FR ' ? 'fr' : 'en';
    expect(resolveLanguage(value)).toBe(expected);
  });

  test('every locale has exactly 5 questions', () => {
    expect(getLocale('en').messages.questions).toHaveLength(5);
    expect(getLocale('fr').messages.questions).toHaveLength(5);
  });

  test('formats the date for the active locale', () => {
    const date = new Date(2026, 10, 24);
    expect(formatLocalDate(date, getLocale('en').messages)).toMatch(/24 November 2026/);
    expect(formatLocalDate(date, getLocale('fr').messages)).toMatch(/24 novembre 2026/);
  });
});
