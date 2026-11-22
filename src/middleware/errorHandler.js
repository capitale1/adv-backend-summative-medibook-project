const { AppError } = require('../utils/errors');

const MYSQL_ERROR_MAP = {
  ER_DUP_ENTRY: [409, 'A record with the same unique value already exists'],
  ER_ROW_IS_REFERENCED_2: [409, 'This record has related appointments and cannot be deleted'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'A value violates a database constraint'],
};

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  const mapped = MYSQL_ERROR_MAP[err.code];
  if (mapped) {
    return res.status(mapped[0]).json({ error: mapped[1] });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
