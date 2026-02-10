const crypto = require('crypto');
const User =  require('../models/user');
//const Driver = require('../models/Driver');
//const Customer = require('../models/Customer');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const { otpverificationTemplate, welcomeEmailTemplate } = require('../utils/emailTemplate');

//WELCOME SCREEN OPTIONS
// ROUTES  GET /api/auth/welcome

exports.getWelcomeScreen = async (req, res) => {
    try {
        // getting welcome screen data from user model
        const welcomeData = User.getWelcomeScreenOptions();

        res.status(200).json({
            success: true,
            data: welcomeData
        });
    } catch (error) {
        console.error('Welcome Screen Error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};
// select Role (Driver or Customer)
// route POST /api/auth/select-role
exports.selectRole = async (req, res) => {
    try{
        const { role } = req.body;

        //validation
        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Please select a role (driver or customer)',
                field: 'role'
            });
        }

        // Validate role value
        if (!['driver', 'customer'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Please select either "driver" or "customer"',
                field: 'role'
            });
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

        res.status(200).json({
            success: true,
            message: `Role selected Successfully! You can now signup as ${role}`,
            data: {
                selectedRole: role,
                sessionToken: sessionToken,
                nextStep: `Please proceed to signup as ${role}`
            }
        });

    }catch (error) {
        console.error('select role error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

// Register user (send OTP)
// Routes POST /api/auth/signup


exports.signup = async (req, res) => {
    try {
        const { sessionToken, fullname, mobile, email, gender, password, confirmpassword } = req.body;
        

        //validating session Token

        if(!sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Session token is required. Please select your role first. ',
                redirectToWelcome: true
            });
        }

        // find user by session token
        const user = await User.findOne({ sessionToken });

        if(!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired session. Please select your role again.',
                redirectToWelcome: true
            });
        }

        //check if role was selected
        if (!user.selectedRole) {
            return res.status(400).json({
                success: false,
                message: 'No role selected. Please select your role first.',
                redirectToWelcome: true
            });
        }

        // sessiontime out code here....................
        // Validation of input fields.
        if (!fullname || !mobile || !email || !gender  || !password || !confirmpassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
                missingfields: {
                    fullname: !fullname,
                    mobile: !mobile,
                    email: !email,
                    gender: !gender,
                    password: !password,
                    confirmpassword: !confirmpassword
                }
            });
        }

        //validating email format
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
                field: 'email'
            });
        }
        // if (!gender || gender === 'Select') {
        //         return res.status(400).json({
        //         success: false,
        //         message: 'Please select a valid gender',
        //         field: 'gender'
        //     });
        // }


        //validating phone number (11 digit)
        const mobileRegex = /^[0-9]{11}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be exactly 11 digits',
                field: 'mobile'
            });
        }
        //validating password length 

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be atleast 6 characters long',
                field: 'password'
            });
        }
        //checking if password matches
        if (password !== confirmpassword) {
            return res.status(400).json({
                success: false,
                message: 'Password do not match',
                field: 'confirmpassword'
            });
        }

        // checking duplicate users
        // if email already exists
        const existingEmailUser = await User.findOne({ 
            email,
            _id: {$ne: user._id }
        });
        if (existingEmailUser) {
            return res.status(400).json({
                success: false,
                message: 'This email address is already registered',
                field: 'email'
            });
        }

        //if phone number already exists

        const existingPhoneUser = await User.findOne({ 
            mobile,
            _id: {$ne: user._id }
        });
        if (existingPhoneUser) {
            return res.status(400).json({
                success: false,
                message: 'This mobile number is already registered',
                field: 'mobile'
            });
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
            subject: 'Verify your email address',
            html:otpverificationTemplate(user.fullname, otp)
        });

        if(!emailResult.success) {
            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again'

            });
        }

        // generating session token


        // sending success response for registration and OTP

        res.status(201).json({
            success: true,
            message: 'Registration Successful! Please check your Email for OTP.',
            data: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                gender: user.gender,
                sessionToken,
                otpSent: true,
                otpExpiresIn: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Please try again.',
            error: error.message
        });
    }
};

//verify email otp
//routes: POST /api/auth/verify-otp

exports.verifyOTP = async (req, res) => {
    try{
        const { email, otp, sessionToken} = req.body;

        // validate input
        if (!email || !otp ||!sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email , OTP and session Token'
            });
        }

        //validate OTP FORMAT (6 DIGITS)
        if(!/^[0-9]{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be 6 digit',
                field: 'otp'
            });
        }
        // find user
        const user = await User.findOne({
            email,
            sessionToken
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Session. Please register again. ',
                redirectToHome: true
            });
        }

        //Check if already verified
        if (user.isemailverified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified. Please login.'
            });
        }

        //hash the entered OTP
        const hashedOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');


        //check if otp matches

        if(user.emailVerficationOTP !== hashedOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP, Please Try again',
                failed: 'otp'
            });
        }
        //check if otp is expired: 
        if (user.emailOTPExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Request a new one.',
                otpExpired: true
            });
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
        res.status(200).json({
            success: true,
            message: 'Email Verified Successfully! Welcome to Ride App.',
            token,
            data: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                userType: user.userType,
                gender:user.gender,
                isemailverified: user.isemailverified
            }
        });


    }catch (error){
        console.error('OTP verification error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

//resend otp
// POST /api/auth/resend-otp

exports.resendOTP = async (req, res) =>{
    try {
        const { email, sessionToken } = req.body;

        if (!email || !sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and session token'
            });
        }
        const user = await User.findOne({
            email,
            sessionToken,
            isemailverified: false
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session or email already verified'
            });
        }
        const otp = user.generateEmailVerficationOTP();
        await user.save();

        const emailResult = await sendEmail({
            email: user.email,
            subject: 'You nre OTP - Ride App',
            html: otpverificationTemplate(user.fullname, otp)
        });

        if(!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again.'
            });
        }
        res.status(200).json({
            success: true,
            message: 'New OTP send to you email',
            data: {
                email: user.email,
                otpSent: true,
                otpExpiredIn: '5 minutes'
            }
        });
    } catch (error) {
        console.error('Resend OTP error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again',
            error: error.message
        });
    }
};
//login user
// POST /api/auth/login

exports.login = async (req, res) => {
    try{
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if(!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                field: 'email'
            });
        }

        if (!user.isemailverified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before logging in',
                emailNotVerified: true
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                field: 'password'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                userType: user.userType,
                gender: user.gender,
                isemailverified: user.isemailverified
            }
        });
    } catch (error) {
        console.error('Login error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};
//current user
// GET /api/auth/me

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//logout user
// GET /api/auth/logout

exports.logout = async (req, res) => {
    try{
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};