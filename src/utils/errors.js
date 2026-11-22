class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super(400, 'Validation failed', details);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(404, `${resource} not found`);
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super(409, message, details);
  }
}

class UnprocessableError extends AppError {
  constructor(message, details) {
    super(422, message, details);
  }
}

module.exports = { AppError, ValidationError, NotFoundError, ConflictError, UnprocessableError };
