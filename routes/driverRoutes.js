const express = require('express');
const {
    createDriverProfile,
    getDriverProfile,
    updateDriverProfile,
    deleteDriverProfile
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');
const { uploadDriverImages, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// all routes require authentication
//router.use(protect);

// driver profile routes
router.route('/profile')
    .post(uploadDriverImages, handleUploadError, createDriverProfile)
    .get(getDriverProfile)
    .put(uploadDriverImages, handleUploadError, updateDriverProfile)
    .delete(deleteDriverProfile);

module.exports = router;