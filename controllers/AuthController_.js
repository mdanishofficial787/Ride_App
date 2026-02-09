const crypto = require('crypto');
const User =  require('../models/user');
//const Driver = require('../models/Driver');
//const Customer = require('../models/Customer');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const { otpverificationTemplate, welcomeEmailTemplate } = require('../utils/emailTemplate')

// Register user (send OTP)
// Routes POST /api/auth/signup


exports.signup = async (req, res) => {
    try {
        const { fullname, mobile, email,gender, password, confirmpassword } = req.body;

        // Validation
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
        const existingEmailUser = await User.findOne({ email });
        if (existingEmailUser) {
            return res.status(400).json({
                success: false,
                message: 'This email address is already registered',
                field: 'email'
            });
        }

        //if phone number already exists

        const existingPhoneUser = await User.findOne({ mobile });
        if (existingPhoneUser) {
            return res.status(400).json({
                success: false,
                message: 'This mobile number is already registered',
                field: 'mobile'
            });
        }

        //creating user
        const user = await User.create({
            fullname,
            mobile,
            email,
            password,
            userType: 'customer',
            isemailverified: false
        });

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

        const sessionToken = user.generateSessionToken();
        await user.save();

        // sending success response for registration and OTP

        res.status(201).json({
            success: true,
            message: 'Registration Successful! Please check your Email for OTP.',
            data: {
                userId: user._id,
                fullname: user.fullname,
                email: user.email,
                mobile: user.mobile,
                sessionToken,
                otpsent: true,
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
//login user
//current user
//logout