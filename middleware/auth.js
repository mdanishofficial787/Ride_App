const jwt = require('jsonwebtoken');
const User = require('../models/user');

// ============================================
// Protect routes - Verify JWT token
// ============================================
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Check if token exists in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Extract token from "Bearer TOKEN"
            token = req.headers.authorization.split(' ')[1];
        }

        // Make sure token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route. Please login.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find user by id from token
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been deactivated'
                });
            }

            // Attach user to request object
            req.user = user;

            next();

        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route. Invalid token.'
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in authentication',
            error: error.message
        });
    }
};

// ============================================
// Grant access to specific roles
// ============================================
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// ============================================
// Grant access to specific user types
// ============================================
exports.authorizeUserType = (...userTypes) => {
    return (req, res, next) => {
        if (!userTypes.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: `User type '${req.user.userType}' is not authorized to access this route`
            });
        }
        next();
    };
};