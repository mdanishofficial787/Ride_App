const Driver = require('../models/Driver');
const Customer = require('../models/Customer');
const User = require('../models/user');
const Schedule = require('../models/Schedule')
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
        const { status, page = 1, limit = 10, search } = req.query;

        const query = {};
        if (status) query.verificationStatus = status;

        // If search query provided, search by driver user information
        if (search) {
            const users = await User.find({
                userType: 'driver',
                $or: [
                    { fullname: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            query.user = { $in: users.map(u => u._id) };
        }

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
        driver.verificationStatus = 'approved';
        driver.canAcceptRides = true;
        driver.verifiedBy = req.user.id;
        driver.verifiedAt = new Date();
        driver.rejectionReason = undefined;
        driver.rejectedAt = undefined;

        // Add to status history
        driver.statusHistory.push({
            status: 'approved',
            changedBy: req.user.id,
            changedAt: new Date()
        });

        await driver.save();
        await driver.populate('user', 'fullname email mobile');

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
        driver.verificationStatus = 'rejected';
        driver.canAcceptRides = false;
        driver.rejectionReason = reason.trim();
        driver.rejectedAt = new Date();
        driver.verifiedBy = undefined;
        driver.verifiedAt = undefined;

        // Add to status history
        driver.statusHistory.push({
            status: 'rejected',
            reason: reason.trim(),
            changedBy: req.user.id,
            changedAt: new Date()
        });

        
        await driver.save();
        await driver.populate('user','fullname email mobile');

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

//suspend driver
// PUT /api/admin/drivers/:id/suspend

exports.suspendDriver = async (req, res) => {
    try {
        const { reason } = req.body;

        const driver = await Driver.findById(req.params.id);

        if(!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        driver.canAcceptRides = false;
        driver.isAvailable = false;

        driver.statusHistory.push({
            status: 'suspended',
            reason: reason || 'Suspended by admin',
            changedBy: req.user.id,
            changedAt: new Date()
        });

        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Driver suspended successfully',
            data: {
                driverId: driver._id,
                canAcceptRides: driver.canAcceptRides
            }
        });
    }catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error suspending Driver'
        });
    }
};

//delete driver
// DELETE /api/admin/drivers/:id
//private (admin)
exports.deleteDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const userId = driver.user;

        // Delete driver profile
        await Driver.findByIdAndDelete(req.params.id);

        // Optionally delete user account
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: 'Driver and associated user account deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting driver'
        });
    }
};

//    Get Verification Statistics
// route   GET /api/admin/drivers/stats

exports.getVerificationStats = async (req, res) => {
    try {
        const stats = {
            pending: await Driver.countDocuments({ verificationStatus: 'pending' }),
            approved: await Driver.countDocuments({ verificationStatus: 'approved' }),
            rejected: await Driver.countDocuments({ verificationStatus: 'rejected' }),
            total: await Driver.countDocuments()
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching driver statistics'
        });
    }
};

//  ==========   customer management ========
// get customer statistics
// GET /api/admin/customers/stats
// private (admin)

exports.getCustomerStats = async (req, res) => {
    try {
        const stats = {
            total: await Customer.countDocuments(),
            active: await Customer.countDocuments({ accountStatus: 'active', isActive: true }),
            suspended: await Customer.countDocuments({ accountStatus: 'suspended' }),
            blocked: await Customer.countDocuments({ accountStatus: 'blocked' }),
            totalRides: await Customer.aggregate([
                { $group: { _id: null, total: { $sum: '$statistics.totalRides' } } }
            ]).then(result => result[0]?.total || 0),
            totalRevenue: await Customer.aggregate([
                { $group: { _id: null, total: { $sum: '$statistics.totalSpent' } } }
            ]).then(result => result[0]?.total || 0)
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching customer statistics'
        });
    }
};

// get all customers
// GET /api/admin/customers
// access private (admin)

exports.getAllCustomers = async (req, res) => {
    try {
        const { accountStatus, isActive, page = 1, limit = 10, search } = req.query;

        const query = {};

        if (accountStatus) {
            query.accountStatus = accountStatus;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Search by name, email, or mobile
        if (search) {
            const users = await User.find({
                userType: 'customer',
                $or: [
                    { fullname: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            query.user = { $in: users.map(u => u._id) };
        }

        const totalCount = await Customer.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        const customers = await Customer.find(query)
            .populate('user', 'fullname email mobile gender createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: customers.length,
            totalCount,
            totalPages,
            currentPage: parseInt(page),
            data: customers.map(customer => ({
                _id: customer._id,
                user: customer.user,
                preferences: customer.preferences,
                statistics: customer.statistics,
                wallet: customer.wallet,
                accountStatus: customer.accountStatus,
                isActive: customer.isActive,
                savedAddresses: customer.savedAddresses.length,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching customers'
        });
    }
};

// Get customer by ID
// GET /api/admin/customers/id
// acess Private (admin)

exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate('user', 'fullname email mobile gender createdAt updatedAt');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get customer's schedules
        const schedules = await Schedule.find({ customer: customer._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                customer,
                schedules: {
                    total: schedules.length,
                    active: schedules.filter(s => s.isActive).length,
                    list: schedules
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching customer details'
        });
    }
};

// Suspend customer
// PUT /api/admin/customers/:id/suspend
// access Private (admin)

exports.suspendCustomer = async (req, res) => {
    try {
        const { reason } = req.body;

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        customer.accountStatus = 'suspended';
        customer.isActive = false;

        await customer.save();

        res.status(200).json({
            success: true,
            message: 'Customer suspended successfully',
            data: {
                customerId: customer._id,
                accountStatus: customer.accountStatus,
                isActive: customer.isActive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error suspending customer'
        });
    }
};

// Activate customer
// PUT /api/admin/customers/:id/activate
// access Private (admin)

exports.activateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        customer.accountStatus = 'active';
        customer.isActive = true;

        await customer.save();

        res.status(200).json({
            success: true,
            message: 'Customer activated successfully',
            data: {
                customerId: customer._id,
                accountStatus: customer.accountStatus,
                isActive: customer.isActive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error activating customer'
        });
    }
};

// Delete customer
// DELETE /api/admin/customers/:id
// PRIVATE (admin)

exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const userId = customer.user;

        // Delete all schedules
        await Schedule.deleteMany({ customer: customer._id });

        // Delete customer profile
        await Customer.findByIdAndDelete(req.params.id);

        // Optionally delete user account
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: 'Customer, schedules, and associated user account deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting customer'
        });
    }
};

// -------Dashboard and analytics

// GET admin dashboard overview
//GET /api/admin/dashboard
// access private (Admin)

exports.getDashboard = async (req, res) => {
    try {
        const dashboard = {
            drivers: {
                total: await Driver.countDocuments(),
                pending: await Driver.countDocuments({ verificationStatus: 'pending' }),
                approved: await Driver.countDocuments({ verificationStatus: 'approved' }),
                rejected: await Driver.countDocuments({ verificationStatus: 'rejected' }),
                online: await Driver.countDocuments({ isAvailable: true })
            },
            customers: {
                total: await Customer.countDocuments(),
                active: await Customer.countDocuments({ accountStatus: 'active', isActive: true }),
                suspended: await Customer.countDocuments({ accountStatus: 'suspended' })
            },
            schedules: {
                total: await Schedule.countDocuments(),
                active: await Schedule.countDocuments({ isActive: true })
            },
            users: {
                totalUsers: await User.countDocuments(),
                admins: await User.countDocuments({ userType: 'admin' }),
                drivers: await User.countDocuments({ userType: 'driver' }),
                customers: await User.countDocuments({ userType: 'customer' })
            }
        };

        res.status(200).json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};
