const Driver = require('../models/Driver');

// MIDDLEWARE: Require Approved Driver Status

exports.requireApprovedDriver = async (req, res, next) => {
    try {
        // Check if user is authenticated (should be done by protect middleware first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated. Please login.',
                authenticationError: true
            });
        }

        // Check if user is a driver
        if (req.user.userType !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This endpoint is only for drivers.',
                requiredUserType: 'driver',
                currentUserType: req.user.userType,
                authorizationError: true
            });
        }

        // Find driver profile
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .select('verificationStatus rejectionReason canAcceptRides verifiedAt rejectedAt');

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create your driver profile first.',
                profileNotFound: true
            });
        }

        // Check verification status
        if (driverProfile.verificationStatus !== 'approved') {
            // Prepare detailed error response based on status
            const errorResponses = {
                pending: {
                    success: false,
                    message: 'Access denied. Your driver profile is pending admin verification.',
                    verificationStatus: 'pending',
                    canAcceptRides: false,
                    authorizationError: true,
                    reason: 'Your profile is under review by our admin team. You will be notified once verified.',
                    nextSteps: [
                        'Wait for admin verification',
                        'Verification typically takes 24-48 hours',
                        'You will receive a notification once approved'
                    ]
                },
                rejected: {
                    success: false,
                    message: 'Access denied. Your driver profile has been rejected.',
                    verificationStatus: 'rejected',
                    canAcceptRides: false,
                    rejectionReason: driverProfile.rejectionReason,
                    rejectedAt: driverProfile.rejectedAt,
                    authorizationError: true,
                    reason: 'Your profile was rejected by the admin. Please review the rejection reason and update your profile.',
                    nextSteps: [
                        'Review the rejection reason carefully',
                        'Update your documents if needed',
                        'Contact support for clarification if needed',
                        'Resubmit your profile after corrections'
                    ]
                }
            };

            return res.status(403).json(
                errorResponses[driverProfile.verificationStatus] || {
                    success: false,
                    message: 'Access denied. Driver not approved.',
                    authorizationError: true
                }
            );
        }

        // Driver is approved - attach profile to request
        req.driverProfile = driverProfile;

        next();

    } catch (error) {
        console.error('Driver authorization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authorization check',
            error: error.message
        });
    }
};


// MIDDLEWARE: Check if Driver Profile Exists

exports.requireDriverProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated. Please login.'
            });
        }

        if (req.user.userType !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only drivers can access this endpoint.'
            });
        }

        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create your driver profile first.',
                profileNotFound: true,
                nextStep: 'Create your driver profile by submitting all required documents'
            });
        }

        req.driverProfile = driverProfile;
        next();

    } catch (error) {
        console.error('Driver profile check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during profile check',
            error: error.message
        });
    }
};


// MIDDLEWARE: Log Driver Activity

exports.logDriverActivity = (action) => {
    return async (req, res, next) => {
        try {
            if (req.driverProfile) {
                console.log(`[DRIVER ACTIVITY] Driver ${req.user.id} - ${action} - ${new Date().toISOString()}`);
                // You can store this in a database for audit trail
                // await DriverActivity.create({ driver: req.user.id, action, timestamp: Date.now() });
            }
            next();
        } catch (error) {
            // Don't block request if logging fails
            console.error('Activity logging error:', error);
            next();
        }
    };
};