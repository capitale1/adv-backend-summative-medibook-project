const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const STYLES = `
  :root { color-scheme: light dark; --bg: #f6f7f9; --card: #ffffff; --text: #1d2330; --muted: #5b6475; --border: #d5dae3; --accent: #1f6feb; }
  @media (prefers-color-scheme: dark) { :root { --bg: #11151c; --card: #1a2029; --text: #e6e9ef; --muted: #9aa4b5; --border: #2e3644; --accent: #4c8dff; } }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  main { max-width: 760px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
  nav a { color: var(--accent); margin-left: 0.75rem; text-decoration: none; }
  nav a[aria-current="true"] { font-weight: 700; text-decoration: underline; }
  .date { color: var(--muted); margin: 0.25rem 0 1rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; }
  label { display: block; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  textarea { width: 100%; min-height: 110px; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font: inherit; resize: vertical; }
  button { margin-top: 1.5rem; padding: 0.7rem 1.4rem; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
`;

function renderLayout(language, messages, languages, body) {
  const links = languages
    .map(({ code, name }) => `<a href="/feedback?lang=${code}"${code === language ? ' aria-current="true"' : ''}>${escapeHtml(name)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(messages.htmlLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(messages.title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(messages.title)}</h1>
      <nav>${links}</nav>
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderFeedbackForm({ language, messages, formattedDate, languages }) {
  const questions = messages.questions
    .map(
      (question, index) => `
      <label for="q${index + 1}">${index + 1}. ${escapeHtml(question)}</label>
      <textarea id="q${index + 1}" name="q${index + 1}" required></textarea>`
    )
    .join('');

  const body = `
    <p class="date">${escapeHtml(messages.dateLabel)}: <time>${escapeHtml(formattedDate)}</time></p>
    <form class="card" method="post" action="/feedback?lang=${language}">
      <p>${escapeHtml(messages.instructions)}</p>
      ${questions}
      <button type="submit">${escapeHtml(messages.submit)}</button>
    </form>`;

  return renderLayout(language, messages, languages, body);
}

function renderThankYou({ language, messages, languages }) {
  const body = `
    <div class="card">
      <p>${escapeHtml(messages.thankYou)}</p>
      <p><a href="/feedback?lang=${language}">${escapeHtml(messages.backLink)}</a></p>
    </div>`;
  return renderLayout(language, messages, languages, body);
}

module.exports = { escapeHtml, renderFeedbackForm, renderThankYou };
