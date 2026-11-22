const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const MS_PER_HOUR = 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseLocalDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const date = new Date(year, month - 1, day, hour, minute, second);

  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second;
  return roundTrips ? date : null;
}

function formatSqlDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatSqlDateTime(date) {
  return `${formatSqlDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function dayBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return [formatSqlDateTime(start), formatSqlDateTime(next)];
}

module.exports = { MS_PER_HOUR, parseLocalDateTime, formatSqlDate, formatSqlDateTime, dayBounds };
