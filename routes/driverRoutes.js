const express = require('express');
const {
    createDriverProfile,
    getDriverProfile,
    getVerificationStatus,
    updateLocation,
    getCurrentLocation,
    toggleAvailability,
    findNearbyDrivers,
    deleteDriverProfile
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');
const { uploadAllDriverDocuments, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Driver profile routes
router.route('/profile')
    .post(uploadAllDriverDocuments, handleUploadError, createDriverProfile)
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

//nearby drivers route
router.post('/nearby', findNearbyDrivers);

module.exports = router;
