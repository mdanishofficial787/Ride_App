const express = require('express');
const {
    createDriverProfile,
    getDriverProfile,
    getVerificationStatus,
    updateLocation,
    getCurrentLocation,
    toggleAvailability,
    setAvailabilitySettings,
    findEligibleDrivers,
    deleteDriverProfile
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');
const { uploadFields, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Driver profile routes
router.route('/profile')
    .post(uploadFields, createDriverProfile)
    .get(getDriverProfile)
    .delete(deleteDriverProfile);


// Verification status
router.get('/verification-status', getVerificationStatus);

//location routes
router.route('/location')
    .put(updateLocation)
    .get(getCurrentLocation);

//availability route
router.put('/availability',toggleAvailability);
router.put('/availability-settings', setAvailabilitySettings);

//find eligible drivers (can be called by customers or system)
router.post('/find-eligible', findEligibleDrivers);
//handling upload error
router.use(handleUploadError);
module.exports = router;
