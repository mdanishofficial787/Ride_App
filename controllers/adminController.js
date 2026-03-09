const Driver = require('../models/Driver');
const User = require('../models/user');
const { errorResponse, successResponse } = require('../utils/helpers');

//Get Driver with sensitive data (admin Only)
// GET /api/admin/drivers/:id/full
// private(admin) - SENSITIVE DATA

exports.getDriverFullDetails = async (req, res) => {
    try {
        // Explicitly select sensitive fields (they have select: false)
        const driver = await Driver.findById(req.params.id)
            .select('+cnic +documents +vehicleDocuments +vehicleLicenseNumber +vehicleRegistrationNumber')
            .populate('user', 'fullname email mobile gender createdAt')
            .populate('verifiedBy', 'fullname email')
            .populate('statusHistory.changedBy', 'fullname email');

        if (!driver) {
            return res.status(404).json(errorResponse('Driver not found'));
        }

        // Log sensitive data access
        driver.logSensitiveAccess(req.user.id, 'view', req.ip);
        await driver.save();

        // Return full details including sensitive data
        res.status(200).json(successResponse('Driver full details retrieved (Admin Access)', {
            ...driver.toObject(),
            cnicDecrypted: driver.getDecryptedCNIC(),
            sensitiveDataWarning: 'This response contains sensitive personal information. Handle with care.'
        }));

    } catch (error) {
        console.error('Get driver full details error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//Get Sensitive Data Access Log
//GET /api/admin/drivers/:id/access-log
// private (admin)

exports.getSensitiveAccessLog = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .select('sensitiveDataAccessLog')
            .populate('sensitiveDataAccessLog.accessedBy', 'fullname email');

        if (!driver) {
            return res.status(404).json(errorResponse('Driver not found'));
        }

        res.status(200).json(successResponse('Access log retrieved', {
            driverId: driver._id,
            accessLog: driver.sensitiveDataAccessLog
        }));

    } catch (error) {
        console.error('Get access log error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};



//    Get All Pending Drivers
// route   GET /api/admin/drivers/pending

exports.getPendingDrivers = async (req, res) => {
    try {
        const pendingDrivers = await Driver.find({ verificationStatus: 'pending' })
            .populate('user', 'fullname email mobile gender createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json(successResponse(`Found ${pendingDrivers.length} pending drivers`, {
            count: pendingDrivers.length,
            drivers: pendingDrivers
        }));

    } catch (error) {
        console.error('Get pending drivers error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//   Get All Drivers
// @route   GET /api/admin/drivers

exports.getAllDrivers = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) query.verificationStatus = status;

        const drivers = await Driver.find(query)
            .populate('user', 'fullname email mobile gender')
            .populate('verifiedBy', 'fullname email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Driver.countDocuments(query);

        res.status(200).json(successResponse('Drivers retrieved successfully', {
            count: drivers.length,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            drivers
        }));

    } catch (error) {
        console.error('Get all drivers error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//     Get Single Driver
// @route   GET /api/admin/drivers/:id

exports.getDriverById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('user', 'fullname email mobile gender createdAt')
            .populate('verifiedBy', 'fullname email')
            .populate('statusHistory.changedBy', 'fullname email');

        if (!driver) {
            return res.status(404).json(errorResponse('Driver not found'));
        }

        res.status(200).json(successResponse('Driver retrieved successfully', driver));

    } catch (error) {
        console.error('Get driver by ID error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//    Approve Driver
// @route   PUT /api/admin/drivers/:id/approve

exports.approveDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id).populate('user', 'fullname email mobile');

        if (!driver) {
            return res.status(404).json(errorResponse('Driver not found'));
        }

        if (driver.verificationStatus === 'approved') {
            return res.status(400).json(errorResponse('Driver is already approved'));
        }

        driver.approve(req.user.id);
        await driver.save();

        res.status(200).json(successResponse('Driver approved successfully', {
            driverId: driver._id,
            driverName: driver.user.fullname,
            driverEmail: driver.user.email,
            verificationStatus: driver.verificationStatus,
            canAcceptRides: driver.canAcceptRides,
            verifiedAt: driver.verifiedAt,
            verifiedBy: req.user.fullname
        }));

    } catch (error) {
        console.error('Approve driver error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};

//     Reject Driver
// route   PUT /api/admin/drivers/:id/reject

exports.rejectDriver = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json(errorResponse('Please provide a rejection reason', 'reason'));
        }

        const driver = await Driver.findById(req.params.id).populate('user', 'fullname email mobile');

        if (!driver) {
            return res.status(404).json(errorResponse('Driver not found'));
        }

        if (driver.verificationStatus === 'rejected') {
            return res.status(400).json(errorResponse('Driver is already rejected'));
        }

        driver.reject(req.user.id, reason);
        await driver.save();

        res.status(200).json(successResponse('Driver rejected successfully', {
            driverId: driver._id,
            driverName: driver.user.fullname,
            driverEmail: driver.user.email,
            verificationStatus: driver.verificationStatus,
            rejectionReason: driver.rejectionReason,
            rejectedAt: driver.rejectedAt
        }));

    } catch (error) {
        console.error('Reject driver error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//    Get Verification Statistics
// route   GET /api/admin/drivers/stats

exports.getVerificationStats = async (req, res) => {
    try {
        const stats = await Driver.aggregate([
            { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
        ]);

        const formattedStats = { pending: 0, approved: 0, rejected: 0, total: 0 };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            formattedStats.total += stat.count;
        });

        res.status(200).json(successResponse('Statistics retrieved successfully', formattedStats));

    } catch (error) {
        console.error('Get verification stats error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};
