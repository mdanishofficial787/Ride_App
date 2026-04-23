// const Customer = require('../models/Customer');
// const User = require('../models/user');
// const { 
//     validateProfileCreation, 
//     validateProfileUpdate, 
//     validateSavedLocation,
//     sanitizeCustomerInput 
// } = require('../validators/customerValidator');
// const { errorResponse, successResponse } = require('../utils/helpers');

// /**
//  * Customer Profile Management Controller
//  * @module controllers/customerController
//  */

// //   Create Customer Profile
// // route   POST /api/customers/profile

// exports.createCustomerProfile = async (req, res) => {
//     try {
//         // Check if user is a customer
//         const user = await User.findById(req.user.id);

//         if (!user) {
//             return res.status(404).json(errorResponse('User not found'));
//         }

//         if (user.userType !== 'customer') {
//             return res.status(403).json(errorResponse('Only customers can create customer profiles'));
//         }

//         // Check if profile already exists
//         const existingProfile = await Customer.findOne({ user: req.user.id });

//         if (existingProfile) {
//             return res.status(400).json(errorResponse('Customer profile already exists', null, {
//                 profileId: existingProfile._id,
//                 message: 'Use the update endpoint to modify your profile'
//             }));
//         }

//         // Sanitize input
//         const sanitizedData = sanitizeCustomerInput(req.body);

//         // Validate input
//         const validation = validateProfileCreation({
//             fullName: sanitizedData.fullName,
//             mobile: sanitizedData.mobile
//         });

//         if (!validation.isValid) {
//             return res.status(400).json(errorResponse('Validation failed', null, {
//                 errors: validation.errors
//             }));
//         }

//         // Check for duplicate mobile
//         const existingMobile = await Customer.findByMobile(sanitizedData.mobile);
//         if (existingMobile) {
//             return res.status(400).json(errorResponse('This mobile number is already registered', 'mobile'));
//         }

//         // Create customer profile
//         const customerProfile = await Customer.create({
//             user: req.user.id,
//             fullName: sanitizedData.fullName,
//             mobile: sanitizedData.mobile,
//             metadata: {
//                 lastIpAddress: req.ip,
//                 userAgent: req.get('user-agent'),
//                 platform: req.body.platform || 'unknown'
//             }
//         });

//         // Populate user data
//         await customerProfile.populate('user', 'email gender createdAt');

//         res.status(201).json(successResponse('Customer profile created successfully', {
//             profileId: customerProfile._id,
//             profile: customerProfile.getOwnProfile(),
//             user: {
//                 email: customerProfile.user.email,
//                 gender: customerProfile.user.gender,
//                 accountCreatedAt: customerProfile.user.createdAt
//             },
//             nextSteps: [
//                 'Set your current location',
//                 'Add a default pickup location',
//                 'Complete your profile to start booking rides'
//             ]
//         }));

//     } catch (error) {
//         console.error('Create customer profile error:', error);
        
//         // Handle validation errors from Mongoose
//         if (error.name === 'ValidationError') {
//             const errors = {};
//             Object.keys(error.errors).forEach(key => {
//                 errors[key] = error.errors[key].message;
//             });
//             return res.status(400).json(errorResponse('Validation failed', null, { errors }));
//         }

//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };

// //    Get Customer Profile
// // route   GET /api/customers/profile

// exports.getCustomerProfile = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id })
//             .populate('user', 'email gender isemailverified createdAt');

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found. Please create your profile first.'));
//         }

//         // Update last active
//         customerProfile.updateActivity();
//         await customerProfile.save();

//         res.status(200).json(successResponse('Profile retrieved successfully', {
//             profile: customerProfile.getOwnProfile(),
//             user: {
//                 email: customerProfile.user.email,
//                 gender: customerProfile.user.gender,
//                 emailVerified: customerProfile.user.isemailverified,
//                 accountCreatedAt: customerProfile.user.createdAt
//             }
//         }));

//     } catch (error) {
//         console.error('Get customer profile error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };

// //    Update Customer Profile
// //route   PUT /api/customers/profile

// exports.updateCustomerProfile = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id });

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found. Please create your profile first.'));
//         }

//         // Sanitize input
//         const sanitizedData = sanitizeCustomerInput(req.body);

//         // Validate update data
//         const validation = validateProfileUpdate(sanitizedData);

//         if (!validation.isValid) {
//             return res.status(400).json(errorResponse('Validation failed', null, {
//                 errors: validation.errors
//             }));
//         }

//         // Track what fields are being updated
//         const updatedFields = [];

//         // Update full name
//         if (sanitizedData.fullName !== undefined) {
//             customerProfile.fullName = sanitizedData.fullName;
//             updatedFields.push('fullName');
//         }

//         // Update current location
//         if (sanitizedData.currentLocation) {
//             if (sanitizedData.currentLocation.latitude !== undefined && 
//                 sanitizedData.currentLocation.longitude !== undefined) {
//                 customerProfile.updateCurrentLocation(
//                     sanitizedData.currentLocation.latitude,
//                     sanitizedData.currentLocation.longitude,
//                     sanitizedData.currentLocation.address
//                 );
//                 updatedFields.push('currentLocation');
//             } else if (sanitizedData.currentLocation.address) {
//                 customerProfile.currentLocation.address = sanitizedData.currentLocation.address;
//                 customerProfile.currentLocation.lastUpdated = Date.now();
//                 updatedFields.push('currentLocation.address');
//             }
//         }

//         // Update default pickup location
//         if (sanitizedData.defaultPickupLocation) {
//             if (!customerProfile.defaultPickupLocation) {
//                 customerProfile.defaultPickupLocation = {};
//             }

//             if (sanitizedData.defaultPickupLocation.name !== undefined) {
//                 customerProfile.defaultPickupLocation.name = sanitizedData.defaultPickupLocation.name;
//                 updatedFields.push('defaultPickupLocation.name');
//             }

//             if (sanitizedData.defaultPickupLocation.address !== undefined) {
//                 customerProfile.defaultPickupLocation.address = sanitizedData.defaultPickupLocation.address;
//                 updatedFields.push('defaultPickupLocation.address');
//             }

//             if (sanitizedData.defaultPickupLocation.latitude !== undefined && 
//                 sanitizedData.defaultPickupLocation.longitude !== undefined) {
//                 customerProfile.defaultPickupLocation.coordinates = {
//                     type: 'Point',
//                     coordinates: [
//                         sanitizedData.defaultPickupLocation.longitude,
//                         sanitizedData.defaultPickupLocation.latitude
//                     ]
//                 };
//                 updatedFields.push('defaultPickupLocation.coordinates');
//             }
//         }

//         // Save changes
//         await customerProfile.save();

//         res.status(200).json(successResponse('Profile updated successfully', {
//             profile: customerProfile.getOwnProfile(),
//             updatedFields,
//             profileCompletionPercentage: customerProfile.completionPercentage
//         }));

//     } catch (error) {
//         console.error('Update customer profile error:', error);
        
//         // Handle validation errors
//         if (error.name === 'ValidationError') {
//             const errors = {};
//             Object.keys(error.errors).forEach(key => {
//                 errors[key] = error.errors[key].message;
//             });
//             return res.status(400).json(errorResponse('Validation failed', null, { errors }));
//         }

//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };


// //  Add Saved Location
// // route   POST /api/customers/saved-locations

// exports.addSavedLocation = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id });

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found'));
//         }

//         // Validate location data
//         const validation = validateSavedLocation(req.body);

//         if (!validation.isValid) {
//             return res.status(400).json(errorResponse('Validation failed', null, {
//                 errors: validation.errors
//             }));
//         }

//         // Prepare location data
//         const locationData = {
//             name: req.body.name.trim(),
//             type: req.body.type,
//             address: req.body.address.trim()
//         };

//         if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
//             locationData.coordinates = {
//                 type: 'Point',
//                 coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
//             };
//         }

//         try {
//             customerProfile.addSavedLocation(locationData);
//             await customerProfile.save();

//             res.status(201).json(successResponse('Location saved successfully', {
//                 savedLocation: locationData,
//                 totalSavedLocations: customerProfile.savedLocations.length
//             }));
//         } catch (addError) {
//             return res.status(400).json(errorResponse(addError.message));
//         }

//     } catch (error) {
//         console.error('Add saved location error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };


// //    Get Saved Locations
// // route   GET /api/customers/saved-locations

// exports.getSavedLocations = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id })
//             .select('savedLocations');

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found'));
//         }

//         res.status(200).json(successResponse('Saved locations retrieved', {
//             savedLocations: customerProfile.savedLocations,
//             count: customerProfile.savedLocations.length
//         }));

//     } catch (error) {
//         console.error('Get saved locations error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };


// //  Delete Saved Location
// // route   DELETE /api/customers/saved-locations/:locationId

// exports.deleteSavedLocation = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id });

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found'));
//         }

//         const locationId = req.params.locationId;
//         const locationIndex = customerProfile.savedLocations.findIndex(
//             loc => loc._id.toString() === locationId
//         );

//         if (locationIndex === -1) {
//             return res.status(404).json(errorResponse('Saved location not found'));
//         }

//         customerProfile.savedLocations.splice(locationIndex, 1);
//         await customerProfile.save();

//         res.status(200).json(successResponse('Location deleted successfully', {
//             remainingLocations: customerProfile.savedLocations.length
//         }));

//     } catch (error) {
//         console.error('Delete saved location error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };

// //    Get Profile Statistics
// // route   GET /api/customers/stats
// exports.getProfileStats = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id })
//             .select('rideStats profileStatus completionPercentage cancellationRate');

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found'));
//         }

//         res.status(200).json(successResponse('Statistics retrieved', {
//             stats: {
//                 rideStats: customerProfile.rideStats,
//                 profileStatus: customerProfile.profileStatus,
//                 completionPercentage: customerProfile.completionPercentage,
//                 cancellationRate: customerProfile.cancellationRate
//             }
//         }));

//     } catch (error) {
//         console.error('Get profile stats error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };

// //  Delete Customer Profile
// // route   DELETE /api/customers/profile

// exports.deleteCustomerProfile = async (req, res) => {
//     try {
//         const customerProfile = await Customer.findOne({ user: req.user.id });

//         if (!customerProfile) {
//             return res.status(404).json(errorResponse('Customer profile not found'));
//         }

//         await Customer.findByIdAndDelete(customerProfile._id);

//         res.status(200).json(successResponse('Profile deleted successfully'));

//     } catch (error) {
//         console.error('Delete customer profile error:', error);
//         res.status(500).json(errorResponse('Server error. Please try again.', null, { 
//             error: error.message 
//         }));
//     }
// };

/**
 * Customer Controller
 * Handles HTTP requests and responses for customer operations
 * Delegates business logic to CustomerService
 */

const CustomerService = require('../services/customerService');
const ResponseHandler = require('../utils/responseHandler');
const { errorHandler } = require('../utils/errorHandler');

class CustomerController {
    /**
     * @desc    Create customer profile
     * @route   POST /api/customers/profile
     * @access  Private (Customer)
     */
    static async createProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const profileData = req.body;

            const customerProfile = await CustomerService.createProfile(userId, profileData);

            return ResponseHandler.created(
                res,
                'Customer profile created successfully',
                {
                    profileId: customerProfile._id,
                    customer: {
                        customerId: customerProfile._id,
                        userId: customerProfile.user._id,
                        fullname: customerProfile.user.fullname,
                        email: customerProfile.user.email,
                        mobile: customerProfile.user.mobile,
                        gender: customerProfile.user.gender
                    },
                    preferences: customerProfile.preferences,
                    statistics: customerProfile.statistics,
                    wallet: customerProfile.wallet,
                    accountStatus: customerProfile.accountStatus,
                    createdAt: customerProfile.createdAt
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Get customer profile
     * @route   GET /api/customers/profile
     * @access  Private (Customer)
     */
    static async getProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const customerProfile = await CustomerService.getProfile(userId);

            return ResponseHandler.success(
                res,
                200,
                'Customer profile retrieved successfully',
                {
                    profile: {
                        customerId: customerProfile._id,
                        user: {
                            userId: customerProfile.user._id,
                            fullname: customerProfile.user.fullname,
                            email: customerProfile.user.email,
                            mobile: customerProfile.user.mobile,
                            gender: customerProfile.user.gender,
                            createdAt: customerProfile.user.createdAt
                        },
                        preferences: customerProfile.preferences,
                        savedAddresses: customerProfile.savedAddresses,
                        statistics: {
                            ...customerProfile.statistics.toObject(),
                            rideCompletionRate: customerProfile.rideCompletionRate,
                            cancellationRate: customerProfile.cancellationRate
                        },
                        wallet: customerProfile.wallet,
                        accountStatus: customerProfile.accountStatus,
                        isActive: customerProfile.isActive,
                        canBookRides: customerProfile.canBookRides(),
                        createdAt: customerProfile.createdAt,
                        updatedAt: customerProfile.updatedAt
                    }
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Update customer profile (fullname, location, preferences)
     * @route   PUT /api/customers/profile
     * @access  Private (Customer)
     */
    /**
     * @desc    Update customer preferences only
     * @route   PUT /api/customers/preferences
     * @access  Private (Customer)
     */

    static async updateProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const  updateData = req.body;

            const customerProfile = await CustomerService.updateProfile(userId, updateData);
            
            return ResponseHandler.success(
                res,
                200,
                'Profile updated successfully',
                {
                    profile: {
                        customerId: customerProfile.id,
                        user: {
                            userId: customerProfile.user._id,
                            fullname: customerProfile.user.fullname,
                            email: customerProfile.user.email,
                            mobile: customerProfile.user.mobile
                        }, 
                        preferences: customerProfile.preferences,
                        savedAddresses: customerProfile.savedAddresses,
                        updatedAt: customerProfile.updatedAt
                    }
                }
            );
        }catch (error) {
            next(error);
        }
    };
    

    /**
     * @desc    Delete customer profile
     * @route   DELETE /api/customers/profile
     * @access  Private (Customer)
     */
    static async deleteProfile(req, res, next) {
        try {
            const userId = req.user.id;
            await CustomerService.deleteProfile(userId);

            return ResponseHandler.success(
                res,
                200,
                'Customer profile deleted successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Add saved address
     * @route   POST /api/customers/profile/addresses
     * @access  Private (Customer)
     */
    static async addSavedAddress(req, res, next) {
        try {
            const userId = req.user.id;
            const addressData = req.body;

            const customerProfile = await CustomerService.addSavedAddress(userId, addressData);

            return ResponseHandler.created(
                res,
                'Address added successfully',
                {
                    savedAddresses: customerProfile.savedAddresses
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Update saved address
     * @route   PUT /api/customers/profile/addresses/:addressId
     * @access  Private (Customer)
     */
    static async updateSavedAddress(req, res, next) {
        try {
            const userId = req.user.id;
            const { addressId } = req.params;
            const updateData = req.body;

            const customerProfile = await CustomerService.updateSavedAddress(
                userId,
                addressId,
                updateData
            );

            return ResponseHandler.success(
                res,
                200,
                'Address updated successfully',
                {
                    savedAddresses: customerProfile.savedAddresses
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Remove saved address
     * @route   DELETE /api/customers/profile/addresses/:addressId
     * @access  Private (Customer)
     */
    static async removeSavedAddress(req, res, next) {
        try {
            const userId = req.user.id;
            const { addressId } = req.params;

            const customerProfile = await CustomerService.removeSavedAddress(userId, addressId);

            return ResponseHandler.success(
                res,
                200,
                'Address removed successfully',
                {
                    savedAddresses: customerProfile.savedAddresses
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Get customer statistics
     * @route   GET /api/customers/profile/statistics
     * @access  Private (Customer)
     */
    static async getStatistics(req, res, next) {
        try {
            const userId = req.user.id;
            const statistics = await CustomerService.getStatistics(userId);

            return ResponseHandler.success(
                res,
                200,
                'Statistics retrieved successfully',
                { statistics }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Get all customers
     * @route   GET /api/customers
     * @access  Private (Admin)
     */
    static async getAllCustomers(req, res, next) {
        try {
            const { accountStatus, isActive, page, limit } = req.query;

            const filters = {};
            if (accountStatus) filters.accountStatus = accountStatus;
            if (isActive !== undefined) filters.isActive = isActive === 'true';

            const pagination = { page, limit };

            const result = await CustomerService.getAllCustomers(filters, pagination);

            return ResponseHandler.success(
                res,
                200,
                'Customers retrieved successfully',
                {
                    customers: result.customers,
                    pagination: {
                        total: result.totalCount,
                        pages: result.totalPages,
                        currentPage: result.currentPage,
                        perPage: parseInt(limit) || 10
                    }
                }
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * @desc    Get customer by ID
     * @route   GET /api/customers/:customerId
     * @access  Private (Admin)
     */
    static async getCustomerById(req, res, next) {
        try {
            const { customerId } = req.params;
            const customer = await CustomerService.getCustomerById(customerId);

            return ResponseHandler.success(
                res,
                200,
                'Customer retrieved successfully',
                { customer }
            );
        } catch (error) {
            next(error);
        }
    }
}

module.exports = CustomerController;