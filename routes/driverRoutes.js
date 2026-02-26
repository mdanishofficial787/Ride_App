const express = require('express');
const {
    createDriverProfile,
    getDriverProfile,
    getVerificationStatus,
    getDocumentStatus,
    deleteDriverProfile,
    updateLocation,
    getCurrentLocation,
    toggleAvailability,
    findNearbyDrivers
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');
const { uploadAllDriverDocuments, handleUploadError } = require('../middleware/upload');

const router = express.Router();
const { 
    requireApprovedDriver, 
    requireDriverProfile,
    logDriverActivity 
} = require('../middleware/driverAuth');
// All routes require authentication
router.use(protect);

// Driver profile routes
router.route('/profile')
    .post(uploadAllDriverDocuments, handleUploadError, createDriverProfile)
    .get(getDriverProfile)
    .delete(deleteDriverProfile);

// Document status route
router.get('/profile/document-status', getDocumentStatus);

// Verification status route
router.get('/profile/verification-status', getVerificationStatus);

//location routes
router.route('/location')
    .put(updateLocation)
    .get(getCurrentLocation);

//availability route
router.put('/availability',requireApprovedDriver, logDriverActivity('TOGGLE_AVAILABILITY'), toggleAvailability);

//nearby drivers route
router.post('/nearby', findNearbyDrivers);

module.exports = router;
