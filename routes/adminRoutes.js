const express = require('express');
const {
    getPendingDrivers,
    getAllDrivers,
    getDriverById,
    approveDriver,
    rejectDriver,
    getVerificationStats
} = require('../controllers/adminController');

const { protect, authorizeUserType } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin user type
router.use(protect);
router.use(authorizeUserType('admin'));

// Statistics
router.get('/drivers/stats', getVerificationStats);

// Driver management
router.get('/drivers/pending', getPendingDrivers);
router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getDriverById);

// Verification actions
router.put('/drivers/:id/approve', approveDriver);
router.put('/drivers/:id/reject', rejectDriver);

module.exports = router;