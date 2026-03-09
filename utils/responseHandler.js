/**
 * Standardized API Response Handler
 * Provides consistent response structure across all endpoints
 */

class ResponseHandler {
    /**
     * Send success response
     * @param {Object} res - Express response object
     * @param {Number} statusCode - HTTP status code
     * @param {String} message - Success message
     * @param {Object} data - Response data
     */
    static success(res, statusCode = 200, message = 'Success', data = null) {
        const response = {
            success: true,
            message,
            ...(data && { data })
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send error response
     * @param {Object} res - Express response object
     * @param {Number} statusCode - HTTP status code
     * @param {String} message - Error message
     * @param {Object} errors - Validation errors or additional error info
     */
    static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
        const response = {
            success: false,
            message,
            ...(errors && { errors })
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send validation error response
     * @param {Object} res - Express response object
     * @param {Object} errors - Validation errors object
     */
    static validationError(res, errors) {
        return this.error(res, 400, 'Validation failed', errors);
    }

    /**
     * Send not found response
     * @param {Object} res - Express response object
     * @param {String} resource - Resource name that was not found
     */
    static notFound(res, resource = 'Resource') {
        return this.error(res, 404, `${resource} not found`);
    }

    /**
     * Send unauthorized response
     * @param {Object} res - Express response object
     * @param {String} message - Custom unauthorized message
     */
    static unauthorized(res, message = 'Not authorized to access this resource') {
        return this.error(res, 401, message);
    }

    /**
     * Send forbidden response
     * @param {Object} res - Express response object
     * @param {String} message - Custom forbidden message
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, 403, message);
    }

    /**
     * Send created response
     * @param {Object} res - Express response object
     * @param {String} message - Success message
     * @param {Object} data - Created resource data
     */
    static created(res, message = 'Resource created successfully', data = null) {
        return this.success(res, 201, message, data);
    }
}

module.exports = ResponseHandler;