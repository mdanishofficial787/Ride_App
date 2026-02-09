const express = require('express');
const { signup, verifyOTP } = require('../controllers/AuthController_');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);


module.exports = router;