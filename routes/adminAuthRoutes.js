/**
 * Admin Authentication Routes
 */

const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');
const { protect, authorizeUserType } = require('../middleware/auth');

const router = express.Router();

// Public routes (require secret key)
router.post('/register', adminAuthController.registerAdmin);
router.post('/login', adminAuthController.adminLogin);

// Protected routes (require admin authentication)
router.get('/me', protect, authorizeUserType('admin'), adminAuthController.getCurrentAdmin);
router.get('/admins', protect, authorizeUserType('admin'), adminAuthController.getAllAdmins);

module.exports = router;