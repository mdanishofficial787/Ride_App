/**
 * Admin Authentication Controller
 * Handles admin registration and authentication
 */

const User = require('../models/user');
const crypto = require('crypto');

/**
 * @desc    Register admin (requires secret key)
 * @route   POST /api/admin/auth/register
 * @access  Public (with secret key)
 */
exports.registerAdmin = async (req, res, next) => {
    try {
        const { fullname, mobile, email, password, confirmpassword, gender, adminSecret } = req.body;

        // Validate admin secret
        if (!adminSecret || adminSecret !== process.env.ADMIN_SETUP_SECRET) {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin registration secret. Unauthorized.'
            });
        }

        // Validate required fields
        if (!fullname || !mobile || !email || !password || !confirmpassword || !gender) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
                required: ['fullname', 'mobile', 'email', 'password', 'confirmpassword', 'gender', 'adminSecret']
            });
        }

        // Validate password match
        if (password !== confirmpassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Validate mobile format
        if (!/^03\d{9}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number. Must be 11 digits starting with 03'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email 
                    ? 'Email already registered' 
                    : 'Mobile number already registered'
            });
        }

        // Create admin user
        const admin = await User.create({
            fullname,
            mobile,
            email,
            password,
            gender,
            userType: 'admin',
            role: 'admin',
            isemailverified: true, // Auto-verify admin
            isActive: true
        });

        // Generate JWT token
        const token = admin.getSignedJwtToken();

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            token,
            data: {
                userId: admin._id,
                fullname: admin.fullname,
                email: admin.email,
                mobile: admin.mobile,
                userType: admin.userType,
                role: admin.role,
                isemailverified: admin.isemailverified,
                createdAt: admin.createdAt
            }
        });

    } catch (error) {
        console.error('Admin registration error:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email or mobile number already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const errors = {};
            Object.keys(error.errors).forEach(key => {
                errors[key] = error.errors[key].message;
            });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during admin registration'
        });
    }
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
exports.adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find admin user
        const admin = await User.findOne({ 
            email,
            userType: 'admin',
            role: 'admin',
            isActive: true
        }).select('+password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials or not an admin account'
            });
        }

        // Check password
        const isPasswordMatch = await admin.matchPassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = admin.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            data: {
                userId: admin._id,
                fullname: admin.fullname,
                email: admin.email,
                mobile: admin.mobile,
                userType: admin.userType,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

/**
 * @desc    Get current admin details
 * @route   GET /api/admin/auth/me
 * @access  Private (Admin)
 */
exports.getCurrentAdmin = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('-password');

        res.status(200).json({
            success: true,
            data: admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching admin details'
        });
    }
};

/**
 * @desc    Get all admins (Super admin only)
 * @route   GET /api/admin/auth/admins
 * @access  Private (Admin)
 */
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({
            userType: 'admin',
            role: 'admin'
        }).select('-password').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching admins'
        });
    }
};