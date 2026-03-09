/**
 * Customer Service Layer
 * Handles business logic for customer operations
 * Follows Single Responsibility Principle
 */

const Customer = require('../models/Customer');
const User = require('../models/user');
const {
    NotFoundError,
    ConflictError,
    ValidationError,
    ForbiddenError
} = require('../utils/errorHandler');
const Validators = require('../utils/validators');

class CustomerService {
    /**
     * Create customer profile
     * @param {String} userId - User ID from authenticated token
     * @param {Object} profileData - Profile data
     * @returns {Promise<Object>}
     */
    static async createProfile(userId, profileData) {
        // Check if user exists and is a customer
        const user = await User.findById(userId);
        
        if (!user) {
            throw new NotFoundError('User');
        }

        if (user.userType !== 'customer') {
            throw new ForbiddenError('Only customers can create customer profiles');
        }

        // Check if profile already exists
        const existingProfile = await Customer.findOne({ user: userId });
        
        if (existingProfile) {
            throw new ConflictError('Customer profile already exists');
        }

        // Create customer profile
        const customerProfile = await Customer.create({
            user: userId,
            ...profileData
        });

        // Populate user data
        await customerProfile.populate('user', 'fullname email mobile gender');

        return customerProfile;
    }

    /**
     * Get customer profile
     * @param {String} userId - User ID
     * @returns {Promise<Object>}
     */
    static async getProfile(userId) {
        const customerProfile = await Customer.findOne({ user: userId })
            .populate('user', 'fullname email mobile gender createdAt');

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        return customerProfile;
    }

    /**
     * Update customer profile
     * @param {String} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>}
     */
    static async updateProfile(userId, updateData) {
        const customerProfile = await Customer.findOne({ user: userId });

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        // Update allowed fields
        const allowedUpdates = ['preferences'];
        
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                if (key === 'preferences') {
                    customerProfile.preferences = {
                        ...customerProfile.preferences,
                        ...updateData.preferences
                    };
                } else {
                    customerProfile[key] = updateData[key];
                }
            }
        });

        await customerProfile.save();
        await customerProfile.populate('user', 'fullname email mobile gender');

        return customerProfile;
    }

    /**
     * Delete customer profile
     * @param {String} userId - User ID
     * @returns {Promise<Boolean>}
     */
    static async deleteProfile(userId) {
        const customerProfile = await Customer.findOne({ user: userId });

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        await Customer.findByIdAndDelete(customerProfile._id);
        return true;
    }

    /**
     * Add saved address
     * @param {String} userId - User ID
     * @param {Object} addressData - Address data
     * @returns {Promise<Object>}
     */
    static async addSavedAddress(userId, addressData) {
        const customerProfile = await Customer.findOne({ user: userId });

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        // Validate coordinates
        const { latitude, longitude } = addressData;
        
        if (!Validators.isValidLatitude(latitude)) {
            throw new ValidationError('Invalid latitude', {
                latitude: 'Latitude must be between -90 and 90'
            });
        }

        if (!Validators.isValidLongitude(longitude)) {
            throw new ValidationError('Invalid longitude', {
                longitude: 'Longitude must be between -180 and 180'
            });
        }

        // Format address data
        const formattedAddress = {
            label: addressData.label || 'other',
            address: addressData.address,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            isPrimary: addressData.isPrimary || false
        };

        await customerProfile.addSavedAddress(formattedAddress);
        await customerProfile.populate('user', 'fullname email mobile');

        return customerProfile;
    }

    /**
     * Update saved address
     * @param {String} userId - User ID
     * @param {String} addressId - Address ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>}
     */
    static async updateSavedAddress(userId, addressId, updateData) {
        const customerProfile = await Customer.findOne({ user: userId });

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        // If updating coordinates, validate them
        if (updateData.latitude && updateData.longitude) {
            if (!Validators.isValidLatitude(updateData.latitude)) {
                throw new ValidationError('Invalid latitude');
            }

            if (!Validators.isValidLongitude(updateData.longitude)) {
                throw new ValidationError('Invalid longitude');
            }

            updateData.location = {
                type: 'Point',
                coordinates: [
                    parseFloat(updateData.longitude),
                    parseFloat(updateData.latitude)
                ]
            };

            delete updateData.latitude;
            delete updateData.longitude;
        }

        await customerProfile.updateSavedAddress(addressId, updateData);
        await customerProfile.populate('user', 'fullname email mobile');

        return customerProfile;
    }

    /**
     * Remove saved address
     * @param {String} userId - User ID
     * @param {String} addressId - Address ID
     * @returns {Promise<Object>}
     */
    static async removeSavedAddress(userId, addressId) {
        const customerProfile = await Customer.findOne({ user: userId });

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        await customerProfile.removeSavedAddress(addressId);
        await customerProfile.populate('user', 'fullname email mobile');

        return customerProfile;
    }

    /**
     * Get customer statistics
     * @param {String} userId - User ID
     * @returns {Promise<Object>}
     */
    static async getStatistics(userId) {
        const customerProfile = await Customer.findOne({ user: userId })
            .select('statistics');

        if (!customerProfile) {
            throw new NotFoundError('Customer profile');
        }

        return {
            ...customerProfile.statistics.toObject(),
            rideCompletionRate: customerProfile.rideCompletionRate,
            cancellationRate: customerProfile.cancellationRate
        };
    }

    /**
     * Get all active customers (Admin only)
     * @param {Object} filters - Query filters
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>}
     */
    static async getAllCustomers(filters = {}, pagination = {}) {
        const { page = 1, limit = 10 } = pagination;
        
        const query = {};
        
        if (filters.accountStatus) {
            query.accountStatus = filters.accountStatus;
        }

        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }

        const customers = await Customer.find(query)
            .populate('user', 'fullname email mobile gender createdAt')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Customer.countDocuments(query);

        return {
            customers,
            totalCount: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        };
    }

    /**
     * Get customer by ID (Admin only)
     * @param {String} customerId - Customer ID
     * @returns {Promise<Object>}
     */
    static async getCustomerById(customerId) {
        const customer = await Customer.findById(customerId)
            .populate('user', 'fullname email mobile gender createdAt');

        if (!customer) {
            throw new NotFoundError('Customer');
        }

        return customer;
    }
}

module.exports = CustomerService;