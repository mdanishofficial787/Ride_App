//email validation
exports.validateEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

//mobile validation
exports.validateMobile = (mobile) => {
    const mobileRegex = /^[0-9]{11}$/;
    return mobileRegex.test(mobile);
};

//cnic validation
exports.validateCNIC = (cnic) => {
    const cnicRegex = /^[0-9]{13}$/;
    return cnicRegex.test(cnic);
};

// coordinates validation
exports.validateCoordinates = (latitude, longtitude) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
        return {
            valid: false,
            message: 'Invalid latitude. Must be between -90 and 90'
        };
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
        return { valid: false, message: 'Invalid longitude. Must be between -180 and 180' };
    }

    return { valid: true, lat, lng};


};
// Password strength validation
exports.validatePasswordStrength = (password) => {
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }
    return { valid: true };
};

// Vehicle type validation
exports.validateVehicleType = (vehicleType) => {
    const validTypes = ['car', 'bike', 'rickshaw', 'van'];
    return validTypes.includes(vehicleType);
};
