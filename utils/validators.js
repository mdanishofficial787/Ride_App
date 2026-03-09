// //email validation
// exports.validateEmail = (email) => {
//     const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
//     return emailRegex.test(email);
// };

// //mobile validation
// exports.validateMobile = (mobile) => {
//     const mobileRegex = /^[0-9]{11}$/;
//     return mobileRegex.test(mobile);
// };

// //cnic validation
// exports.validateCNIC = (cnic) => {
//     const cnicRegex = /^[0-9]{13}$/;
//     return cnicRegex.test(cnic);
// };

// // coordinates validation
// exports.validateCoordinates = (latitude, longtitude) => {
//     const lat = parseFloat(latitude);
//     const lng = parseFloat(longitude);

//     if (isNaN(lat) || lat < -90 || lat > 90) {
//         return {
//             valid: false,
//             message: 'Invalid latitude. Must be between -90 and 90'
//         };
//     }
//     if (isNaN(lng) || lng < -180 || lng > 180) {
//         return { valid: false, message: 'Invalid longitude. Must be between -180 and 180' };
//     }

//     return { valid: true, lat, lng};


// };
// // Password strength validation
// exports.validatePasswordStrength = (password) => {
//     if (password.length < 6) {
//         return { valid: false, message: 'Password must be at least 6 characters' };
//     }
//     return { valid: true };
// };

// // Vehicle type validation
// exports.validateVehicleType = (vehicleType) => {
//     const validTypes = ['car', 'bike', 'rickshaw', 'van'];
//     return validTypes.includes(vehicleType);
// };

/**
 * Reusable Validation Utilities
 * Provides common validation functions used across the application
 */

class Validators {
    /**
     * Validate email format
     * @param {String} email - Email address to validate
     * @returns {Boolean}
     */
    static isValidEmail(email) {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate mobile number (Pakistan format)
     * @param {String} mobile - Mobile number to validate
     * @returns {Boolean}
     */
    static isValidMobile(mobile) {
        const mobileRegex = /^03[0-9]{9}$/;
        return mobileRegex.test(mobile);
    }

    /**
     * Validate CNIC (Pakistan format)
     * @param {String} cnic - CNIC to validate
     * @returns {Boolean}
     */
    static isValidCNIC(cnic) {
        const cnicRegex = /^[0-9]{13}$/;
        return cnicRegex.test(cnic);
    }

    /**
     * Validate password strength
     * @param {String} password - Password to validate
     * @returns {Object} - { isValid: Boolean, message: String }
     */
    static isValidPassword(password) {
        if (!password || password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters long'
            };
        }

        return { isValid: true, message: 'Valid password' };
    }

    /**
     * Validate latitude
     * @param {Number} latitude - Latitude to validate
     * @returns {Boolean}
     */
    static isValidLatitude(latitude) {
        const lat = parseFloat(latitude);
        return !isNaN(lat) && lat >= -90 && lat <= 90;
    }

    /**
     * Validate longitude
     * @param {Number} longitude - Longitude to validate
     * @returns {Boolean}
     */
    static isValidLongitude(longitude) {
        const lng = parseFloat(longitude);
        return !isNaN(lng) && lng >= -180 && lng <= 180;
    }

    /**
     * Sanitize string input
     * @param {String} str - String to sanitize
     * @returns {String}
     */
    static sanitizeString(str) {
        if (!str) return '';
        return str.trim().replace(/[<>]/g, '');
    }

    /**
     * Validate required fields
     * @param {Object} data - Data object to validate
     * @param {Array} requiredFields - Array of required field names
     * @returns {Object} - { isValid: Boolean, missingFields: Array }
     */
    static validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter(field => {
            return !data[field] || data[field].toString().trim() === '';
        });

        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    }

    /**
     * Validate enum value
     * @param {String} value - Value to validate
     * @param {Array} allowedValues - Array of allowed values
     * @returns {Boolean}
     */
    static isValidEnum(value, allowedValues) {
        return allowedValues.includes(value);
    }
}

module.exports = Validators;
