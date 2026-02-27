const crypto = require('crypto');
const User =  require('../models/user');
//const Driver = require('../models/Driver');
//const Customer = require('../models/Customer');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const { otpverificationTemplate, welcomeEmailTemplate } = require('../utils/emailTemplate');
const { validateEmail, validateMobile, validatePasswordStrenth } = require('../utils/validators');
const { errorResponse, successResponse } = require('../utils/helpers');

//WELCOME SCREEN OPTIONS
// ROUTES  GET /api/auth/welcome

exports.getWelcomeScreen = async (req, res) => {
    try {
        // getting welcome screen data from user model
        const welcomeData = User.getWelcomeScreenOptions();

        res.status(200).json(successResponse('Welcome Screen loaded', welcomeData));
    } catch (error) {
        console.error('Welcome Screen Error: ', error);
        res.status(500).json(errorResponse('Server Error. Please try again.', null, {error: error.message}));
    }
};
// select Role (Driver or Customer)
// route POST /api/auth/select-role
exports.selectRole = async (req, res) => {
    try{
        const { role } = req.body;

        //validation
        if (!role) {
            return res.status(400).json(errorResponse('Please select a role (driver or customer)', 'role'));
        }

        // Validate role value
        if (!['driver', 'customer'].includes(role)) {
            return res.status(400).json(errorResponse('Invalid role, Please select "driver" or "customer"', 'role'));
        }
        //generating unique temporary identifiers

        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 100000);
        // temporary user documents to store role selection

        const tempUser = new User({
            fullname: `TempUser${timestamp}`,
            mobile: `${String(timestamp).slice(-11)}`,
            email:`temp${timestamp}${randomNum}@temp.com`,
            password: `TempPass${timestamp}!@#`,
            gender: 'male',
            userType: role,
            selectedRole: role,
            isTemporary: true
        });
        // session token generation here...................
        const sessionToken = tempUser.generateSessionToken();
        await tempUser.save()

        //sending success response

        res.status(200).json(successResponse(`Role selected: ${role}. Please proceed to signup.`, {
            selectedRole: role,
            sessionToken: sessionToken,
            nextStep: `Complete signup as ${role}`
        }));

    }catch (error) {
        console.error('select role error: ', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};

// Register user (send OTP) (after role selection)
// Routes POST /api/auth/signup


exports.signup = async (req, res) => {
    try {
        const { sessionToken, fullname, mobile, email, gender, password, confirmpassword } = req.body;
        

        //validating session Token

        if(!sessionToken) {
            return res.status(400).json(errorResponse('Session token required. Please select a role first.', null, {redirectToWelcome: true}));
        }

        // find user by session token
        const user = await User.findOne({ sessionToken });

        if(!user) {
            return res.status(400).json(errorResponse('Invalide or expired Session. Please select your role again. ', null, {redirectToWelcome: true}));
        }

        //check if role was selected
        if (!user.selectedRole) {
            return res.status(400).json(errorResponse('No role selected. Please select your role first.', null, { redirectToWelcome: true }));
        }

        // sessiontime out code here....................
        const thirtyMinutes = 30 * 60 * 1000;
        if (user.roleSelectedAt && (Date.now() - user.roleSelectedAt.getTime() > thirtyMinutes)) {
            await User.findByIdAndDelete(user._id);
            return res.status(400).json(errorResponse('Session expired. Please select your role again.', null, { redirectToWelcome: true }));
        }

        // Validation of input fields.
        if (!fullname || !mobile || !email || !gender  || !password || !confirmpassword) {
            return res.status(400).json(errorResponse('Please provide all required fields', null, {
                missingFields: {
                    fullname: !fullname,
                    mobile: !mobile,
                    email: !email,
                    password: !password,
                    confirmpassword: !confirmpassword,
                    gender: !gender
                }
            }));
        }

        //validating email format
        if (!validateEmail(email)) {
            return res.status(400).json(errorResponse('Please provide a valid email address', 'email'));
        }

        // Validate mobile
        if (!validateMobile(mobile)) {
            return res.status(400).json(errorResponse('Mobile number must be exactly 11 digits', 'mobile'));
        }

        // Validate password
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json(errorResponse(passwordValidation.message, 'password'));
        }

        // Check if passwords match
        if (password !== confirmpassword) {
            return res.status(400).json(errorResponse('Passwords do not match', 'confirmpassword'));
        }

        // Check duplicate email
        const existingEmailUser = await User.findOne({ email, _id: { $ne: user._id } });
        if (existingEmailUser) {
            return res.status(400).json(errorResponse('This email address is already registered', 'email'));
        }

        // Check duplicate mobile
        const existingMobileUser = await User.findOne({ mobile, _id: { $ne: user._id } });
        if (existingMobileUser) {
            return res.status(400).json(errorResponse('This mobile number is already registered', 'mobile'));
        }


        // updating user with actual data
        user.fullname = fullname;
        user.mobile = mobile;
        user.email = email;
        user.password = password;
        user.gender = gender;
        user.userType = user.selectedRole;
        user.isemailverified = false;


        // generate OTP (hash stored on user)
        const otp = user.generateEmailVerficationOTP();
        await user.save();

        // otp email sending
        const emailResult = await sendEmail({
            email: user.email,
            subject: 'Verify your Email- Ride App',
            html:otpverificationTemplate(user.fullname, otp)
        });

        if(!emailResult.success) {
            await User.findByIdAndDelete(user._id);

            return res.status(500).json(errorResponse('Failed to send verification email. Please try again.'));
        }

        // generating session token


        // sending success response for registration and OTP

        res.status(201).json(successResponse(`Registration successful as ${user.userType}! Please check your email for OTP.`, {
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            mobile: user.mobile,
            userType: user.userType,
            gender: user.gender,
            sessionToken: user.sessionToken,
            otpSent: true,
            otpExpiresIn: '5 minutes'
        }));

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};

//verify email otp
//routes: POST /api/auth/verify-otp

exports.verifyOTP = async (req, res) => {
    try{
        const { email, otp, sessionToken} = req.body;

        // validate input
        if (!email || !otp ||!sessionToken) {
            return res.status(400).json(errorResponse('Please provide email, OTP, and session token'));
        }

        //validate OTP FORMAT (6 DIGITS)
        if(!/^[0-9]{6}$/.test(otp)) {
            return res.status(400).json(errorResponse('OTP must be 6 digits', 'otp'));
        }
        // find user
        const user = await User.findOne({
            email,
            sessionToken
        });

        if (!user) {
            return res.status(400).json(errorResponse('Invalid session. Please register again.', null, { redirectToHome: true }));
        }

        //Check if already verified
        if (user.isemailverified) {
            return res.status(400).json(errorResponse('Email is already verified. Please login.'));
        }

        //hash the entered OTP
        const hashedOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');


        //check if otp matches

        if(user.emailVerficationOTP !== hashedOTP) {
            return res.status(400).json(errorResponse('Invalid OTP. Please check and try again.', 'otp'));
        }
        //check if otp is expired: 
        if (user.emailOTPExpire < Date.now()) {
            return res.status(400).json(errorResponse('OTP has expired. Please request a new one.', null, { otpExpired: true }));
        }
        //marking verified:
        user.isemailverified = true;
        user.emailVerficationOTP = undefined;
        user.emailOTPExpire = undefined;
        user.sessionToken = undefined;
        await user.save();

        //sending welcome email:
        await sendEmail({
            email: user.email,
            subject: 'Welcome to Ride App',
            html: welcomeEmailTemplate(user.fullname)
        });

        //generating JWT TOKEN
        const token = user.getSignedJwtToken();


        // sending Success response for verification compeletion
        res.status(200).json(successResponse(`Email verified successfully! Welcome as ${user.userType}.`, {
            token,
            user: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                userType: user.userType,
                gender: user.gender,
                isemailverified: user.isemailverified
            }
        }));


    }catch (error){
        console.error('OTP verification error: ', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};

//resend otp
// POST /api/auth/resend-otp

exports.resendOTP = async (req, res) =>{
    try {
        const { email, sessionToken } = req.body;

        if (!email || !sessionToken) {
            return res.status(400).json(errorResponse('Please provide email and session token'));
        }
        const user = await User.findOne({
            email,
            sessionToken,
            isemailverified: false
        });

        if (!user) {
            return res.status(400).json(errorResponse('Invalid session or email already verified'));
        }
        const otp = user.generateEmailVerficationOTP();
        await user.save();

        const emailResult = await sendEmail({
            email: user.email,
            subject: 'You nre OTP - Ride App',
            html: otpverificationTemplate(user.fullname, otp)
        });

        if(!emailResult.success) {
            return res.status(500).json(errorResponse('Failed to send verification email. Please try again.'));
        }
        res.status(200).json(successResponse('New OTP sent to your email', {
            email: user.email,
            otpSent: true,
            otpExpiresIn: '5 minutes'
        }));
    } catch (error) {
        console.error('Resend OTP error: ', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};
//login user
// POST /api/auth/login

exports.login = async (req, res) => {
    try{
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json(errorResponse('Please provide email and password'));
        }

        const user = await User.findOne({ email }).select('+password');

        if(!user) {
            return res.status(401).json(errorResponse('Invalid email or password', 'email'));
        }

        if (!user.isemailverified) {
            return res.status(403).json(errorResponse('Please verify your email before logging in', null, { emailNotVerified: true }));
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json(errorResponse('Invalid email or password', 'password'));
        }

        if (!user.isActive) {
            return res.status(403).json(errorResponse('Your account has been deactivated. Please contact support.'));
        }

        const token = user.getSignedJwtToken();

        res.status(200).json(successResponse(`Login successful as ${user.userType}`, {
            token,
            user: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                userType: user.userType,
                gender: user.gender,
                isemailverified: user.isemailverified
            }
        }));
    } catch (error) {
        console.error('Login error: ', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};
//current user
// GET /api/auth/me

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json(successResponse('User retrieved successfully', user));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//logout user
// GET /api/auth/logout

exports.logout = async (req, res) => {
    try{
        res.status(200).json(successResponse('Logged out successfully'));
    } catch (error) {
        console.error('Logout error: ', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};