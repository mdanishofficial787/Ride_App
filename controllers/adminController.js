const Driver = require('../models/Driver');
const User = require('../models/User');


// Get All Pending Drivers
// @route   GET /api/admin/drivers/pending

exports.getPendingDrivers = async (req, res) => {
    try {
        const pendingDrivers = await Driver.find({ verificationStatus: 'pending' })
            .populate('user', 'fullname email mobile gender createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: pendingDrivers.length,
            data: pendingDrivers
        });

    } catch (error) {
        console.error('Get pending drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//  Get All Drivers (with filters)
// @route   GET /api/admin/drivers

exports.getAllDrivers = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) {
            query.verificationStatus = status;
        }

        const drivers = await Driver.find(query)
            .populate('user', 'fullname email mobile gender')
            .populate('verifiedBy', 'fullname email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Driver.countDocuments(query);

        res.status(200).json({
            success: true,
            count: drivers.length,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: drivers
        });

    } catch (error) {
        console.error('Get all drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//   Get Single Driver Profile
// @route   GET /api/admin/drivers/:id

exports.getDriverById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('user', 'fullname email mobile gender createdAt')
            .populate('verifiedBy', 'fullname email')
            .populate('statusHistory.changedBy', 'fullname email');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        res.status(200).json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Get driver by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


// Approve Driver
// @route   PUT /api/admin/drivers/:id/approve

exports.approveDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('user', 'fullname email mobile');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (driver.verificationStatus === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Driver is already approved'
            });
        }

        // Approve the driver
        driver.approve(req.user.id);
        await driver.save();

        // TODO: Send notification email to driver
        // await sendApprovalEmail(driver.user.email, driver.user.fullname);

        res.status(200).json({
            success: true,
            message: 'Driver approved successfully',
            data: {
                driverId: driver._id,
                driverName: driver.user.fullname,
                driverEmail: driver.user.email,
                verificationStatus: driver.verificationStatus,
                canAcceptRides: driver.canAcceptRides,
                verifiedAt: driver.verifiedAt,
                verifiedBy: req.user.fullname
            }
        });

    } catch (error) {
        console.error('Approve driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//    Reject Driver
// @route   PUT /api/admin/drivers/:id/reject

exports.rejectDriver = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a rejection reason',
                field: 'reason'
            });
        }

        const driver = await Driver.findById(req.params.id)
            .populate('user', 'fullname email mobile');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (driver.verificationStatus === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'Driver is already rejected'
            });
        }

        // Reject the driver
        driver.reject(req.user.id, reason);
        await driver.save();

        // TODO: Send rejection notification email to driver
        // await sendRejectionEmail(driver.user.email, driver.user.fullname, reason);

        res.status(200).json({
            success: true,
            message: 'Driver rejected successfully',
            data: {
                driverId: driver._id,
                driverName: driver.user.fullname,
                driverEmail: driver.user.email,
                verificationStatus: driver.verificationStatus,
                rejectionReason: driver.rejectionReason,
                rejectedAt: driver.rejectedAt
            }
        });

    } catch (error) {
        console.error('Reject driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//     Get Verification Statistics
// @route   GET /api/admin/drivers/stats

exports.getVerificationStats = async (req, res) => {
    try {
        const stats = await Driver.aggregate([
            {
                $group: {
                    _id: '$verificationStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            formattedStats.total += stat.count;
        });

        res.status(200).json({
            success: true,
            data: formattedStats
        });

    } catch (error) {
        console.error('Get verification stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};