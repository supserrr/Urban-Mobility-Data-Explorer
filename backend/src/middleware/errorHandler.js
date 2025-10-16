// Error Handling Middleware

const logger = require('../config/logger');

// Global error handler
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }

    // PostgreSQL errors
    if (err.code && err.code.startsWith('23')) {
        const message = 'Database constraint violation';
        error = { message, statusCode: 400 };
    }

    if (err.code === '23505') {
        const message = 'Duplicate entry - resource already exists';
        error = { message, statusCode: 409 };
    }

    if (err.code === '23503') {
        const message = 'Referenced resource does not exist';
        error = { message, statusCode: 400 };
    }

    // Rate limiting error
    if (err.statusCode === 429) {
        const message = 'Too many requests, please try again later';
        error = { message, statusCode: 429 };
    }

    // Default to 500 server error
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Handle 404 errors
const notFound = (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
};

// Wrapper for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler
};
