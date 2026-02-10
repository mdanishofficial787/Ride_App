const express = require('express');
const {
    getWelcomeScreen,
    selectRole,
    signup,
    verifyOTP,
    resendOTP,
    login,
    getMe,
    logout
} = require('../controllers/AuthController_');

const { protect } = require('../middleware/auth');

const router = express.Router();

//welcome Screen $ role selection Routes

router.get('/welcome', getWelcomeScreen);

// selceting role (Driver or Customer)
router.post('/select-role', selectRole);

//signup (after role selection)
router.post('/signup', signup);
//otp verification
router.post('/verify-otp', verifyOTP);

//resend otp
router.post('/resend-otp', resendOTP);

// // login route
router.post('/login', login);

// get current user details
//router.get('/me', protect, getMe);

// logout route
//router.get('/logout', protect, logout);

module.exports = router;