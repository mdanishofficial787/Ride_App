const { validateCoordinates } = require('../utils/validators');

/**
 * Validation rules for customer operations
 * @module validators/customerValidator
 */

/**
 * Validate customer profile creation data
 * @param {Object} data - Profile data
 * @returns {Object} Validation result
 */
exports.validateProfileCreation = (data) => {
    const errors = {};

    // Full name validation
    if (!data.fullName || data.fullName.trim().length === 0) {
        errors.fullName = 'Full name is required';
    } else if (data.fullName.trim().length < 2) {
        errors.fullName = 'Full name must be at least 2 characters';
    } else if (data.fullName.trim().length > 100) {
        errors.fullName = 'Full name cannot exceed 100 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) {
        errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Mobile validation
    if (!data.mobile) {
        errors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{11}$/.test(data.mobile)) {
        errors.mobile = 'Mobile number must be exactly 11 digits';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate profile update data
 * @param {Object} data - Update data
 * @returns {Object} Validation result
 */
exports.validateProfileUpdate = (data) => {
    const errors = {};

    // Full name validation (if provided)
    if (data.fullName !== undefined) {
        if (!data.fullName || data.fullName.trim().length === 0) {
            errors.fullName = 'Full name cannot be empty';
        } else if (data.fullName.trim().length < 2) {
            errors.fullName = 'Full name must be at least 2 characters';
        } else if (data.fullName.trim().length > 100) {
            errors.fullName = 'Full name cannot exceed 100 characters';
        } else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) {
            errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
        }
    }

    // Current location validation (if provided)
    if (data.currentLocation) {
        if (data.currentLocation.latitude !== undefined && data.currentLocation.longitude !== undefined) {
            const coordValidation = validateCoordinates(
                data.currentLocation.latitude,
                data.currentLocation.longitude
            );
            if (!coordValidation.valid) {
                errors.currentLocation = coordValidation.message;
            }
        }

        if (data.currentLocation.address && data.currentLocation.address.length > 200) {
            errors.currentLocationAddress = 'Address cannot exceed 200 characters';
        }
    }

    // Default pickup location validation (if provided)
    if (data.defaultPickupLocation) {
        if (data.defaultPickupLocation.latitude !== undefined && data.defaultPickupLocation.longitude !== undefined) {
            const coordValidation = validateCoordinates(
                data.defaultPickupLocation.latitude,
                data.defaultPickupLocation.longitude
            );
            if (!coordValidation.valid) {
                errors.defaultPickupLocation = coordValidation.message;
            }
        }

        if (data.defaultPickupLocation.name && data.defaultPickupLocation.name.length > 100) {
            errors.defaultPickupLocationName = 'Location name cannot exceed 100 characters';
        }

        if (data.defaultPickupLocation.address && data.defaultPickupLocation.address.length > 200) {
            errors.defaultPickupLocationAddress = 'Address cannot exceed 200 characters';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate saved location data
 * @param {Object} data - Location data
 * @returns {Object} Validation result
 */
exports.validateSavedLocation = (data) => {
    const errors = {};

    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'Location name is required';
    } else if (data.name.length > 50) {
        errors.name = 'Location name cannot exceed 50 characters';
    }

    if (!data.address || data.address.trim().length === 0) {
        errors.address = 'Address is required';
    } else if (data.address.length > 200) {
        errors.address = 'Address cannot exceed 200 characters';
    }

    if (!data.type || !['home', 'work', 'other'].includes(data.type)) {
        errors.type = 'Type must be: home, work, or other';
    }

    if (data.latitude !== undefined && data.longitude !== undefined) {
        const coordValidation = validateCoordinates(data.latitude, data.longitude);
        if (!coordValidation.valid) {
            errors.coordinates = coordValidation.message;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Sanitize customer input
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data
 */
exports.sanitizeCustomerInput = (data) => {
    const sanitized = {};

    if (data.fullName) {
        sanitized.fullName = data.fullName.trim().replace(/\s+/g, ' ');
    }

    if (data.mobile) {
        sanitized.mobile = data.mobile.replace(/\D/g, ''); // Remove non-digits
    }

    if (data.currentLocation) {
        sanitized.currentLocation = {};
        if (data.currentLocation.address) {
            sanitized.currentLocation.address = data.currentLocation.address.trim();
        }
        if (data.currentLocation.latitude !== undefined) {
            sanitized.currentLocation.latitude = parseFloat(data.currentLocation.latitude);
        }
        if (data.currentLocation.longitude !== undefined) {
            sanitized.currentLocation.longitude = parseFloat(data.currentLocation.longitude);
        }
    }

    if (data.defaultPickupLocation) {
        sanitized.defaultPickupLocation = {};
        if (data.defaultPickupLocation.name) {
            sanitized.defaultPickupLocation.name = data.defaultPickupLocation.name.trim();
        }
        if (data.defaultPickupLocation.address) {
            sanitized.defaultPickupLocation.address = data.defaultPickupLocation.address.trim();
        }
        if (data.defaultPickupLocation.latitude !== undefined) {
            sanitized.defaultPickupLocation.latitude = parseFloat(data.defaultPickupLocation.latitude);
        }
        if (data.defaultPickupLocation.longitude !== undefined) {
            sanitized.defaultPickupLocation.longitude = parseFloat(data.defaultPickupLocation.longitude);
        }
    }

    return sanitized;
};