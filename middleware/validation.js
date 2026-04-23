/**
 * Express Validation Middleware
 * Provides reusable validation middleware for routes
 */

const { ValidationError } = require('../utils/errorHandler');
const Validators = require('../utils/validators');

class ValidationMiddleware {
    /**
     * Validate customer profile creation/update
     */
    static validateCustomerProfile(req, res, next) {
        const { fullname, mobile } = req.body;
        const errors = {};

        // Validate fullname
        if (!fullname || fullname.trim().length === 0) {
            errors.fullname = 'Full name is required';
        } else if (fullname.trim().length < 3) {
            errors.fullname = 'Full name must be at least 3 characters';
        } else if (fullname.trim().length > 50) {
            errors.fullname = 'Full name must not exceed 50 characters';
        }

        // Validate mobile
        if (!mobile) {
            errors.mobile = 'Mobile number is required';
        } else if (!Validators.isValidMobile(mobile)) {
            errors.mobile = 'Invalid mobile number format. Must be 11 digits starting with 03';
        }

        // If there are validation errors, throw ValidationError
        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        // Sanitize inputs
        req.body.fullname = Validators.sanitizeString(fullname);
        req.body.mobile = mobile.trim();

        next();
    }

    /**
     * Validate location data
     */
    static validateLocation(req, res, next) {
        const { latitude, longitude } = req.body;
        const errors = {};

        if (latitude === undefined || latitude === null) {
            errors.latitude = 'Latitude is required';
        } else if (!Validators.isValidLatitude(latitude)) {
            errors.latitude = 'Invalid latitude. Must be between -90 and 90';
        }

        if (longitude === undefined || longitude === null) {
            errors.longitude = 'Longitude is required';
        } else if (!Validators.isValidLongitude(longitude)) {
            errors.longitude = 'Invalid longitude. Must be between -180 and 180';
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        next();
    }

    /**
     * Validate booking request
     */
    static validateBookingRequest(req, res, next) {
        const {
            pickupLatitude,
            pickupLongitude,
            dropoffLatitude,
            dropoffLongitude,
            vehicleType
        } = req.body;

        const errors = {};

        // Validate pickup location
        if (!pickupLatitude) {
            errors.pickupLatitude = 'Pickup latitude is required';
        } else if (!Validators.isValidLatitude(pickupLatitude)) {
            errors.pickupLatitude = 'Invalid pickup latitude';
        }

        if (!pickupLongitude) {
            errors.pickupLongitude = 'Pickup longitude is required';
        } else if (!Validators.isValidLongitude(pickupLongitude)) {
            errors.pickupLongitude = 'Invalid pickup longitude';
        }

        // Validate dropoff location
        if (!dropoffLatitude) {
            errors.dropoffLatitude = 'Dropoff latitude is required';
        } else if (!Validators.isValidLatitude(dropoffLatitude)) {
            errors.dropoffLatitude = 'Invalid dropoff latitude';
        }

        if (!dropoffLongitude) {
            errors.dropoffLongitude = 'Dropoff longitude is required';
        } else if (!Validators.isValidLongitude(dropoffLongitude)) {
            errors.dropoffLongitude = 'Invalid dropoff longitude';
        }

        // Validate vehicle type
        const allowedVehicleTypes = ['car', 'bike', 'rickshaw', 'van'];
        if (vehicleType && !Validators.isValidEnum(vehicleType, allowedVehicleTypes)) {
            errors.vehicleType = `Invalid vehicle type. Allowed: ${allowedVehicleTypes.join(', ')}`;
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Validation failed', errors);
        }

        next();
    }
}

module.exports = ValidationMiddleware;