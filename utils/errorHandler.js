/**
 * Custom Error Classes and Error Handler
 * Provides structured error handling across the application
 */

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = {}) {
        super(message, 400);
        this.errors = errors;
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Not authorized') {
        super(message, 401);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new NotFoundError(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        error = new ConflictError(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).reduce((acc, error) => {
            acc[error.path] = error.message;
            return acc;
        }, {});
        error = new ValidationError('Validation failed', errors);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new UnauthorizedError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new UnauthorizedError('Token expired');
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal Server Error',
        ...(error.errors && { errors: error.errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    errorHandler
};