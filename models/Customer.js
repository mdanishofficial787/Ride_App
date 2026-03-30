// const mongoose = require('mongoose');

// const CustomerSchema = new mongoose.Schema(
//     {
//         // CORE IDENTITY (Linked to User Account)
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//             required: [true, 'User reference is required'],
//             unique: true,
//             index: true
//         },
//         // PROFILE INFORMATION


//         fullName: {
//             type: String,
//             required: [true, 'Full name is required'],
//             trim: true,
//             minlength: [2, 'Full name must be at least 2 characters'],
//             maxlength: [100, 'Full name cannot exceed 100 characters'],
//             validate: {
//                 validator: function(value) {
//                     // Only letters, spaces, hyphens, and apostrophes
//                     return /^[a-zA-Z\s'-]+$/.test(value);
//                 },
//                 message: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
//             }
//         },

//         mobile: {
//             type: String,
//             required: [true, 'Mobile number is required'],
//             unique: true,
//             match: [/^[0-9]{11}$/, 'Mobile number must be exactly 11 digits'],
//             index: true
//         },


//         // LOCATION PREFERENCES

//         currentLocation: {
//             address: {
//                 type: String,
//                 trim: true,
//                 maxlength: [200, 'Address cannot exceed 200 characters']
//             },
//             coordinates: {
//                 type: {
//                     type: String,
//                     enum: ['Point'],
//                     default: 'Point'
//                 },
//                 coordinates: {
//                     type: [Number], // [longitude, latitude]
//                     validate: {
//                         validator: function(coords) {
//                             if (!coords || coords.length !== 2) return false;
//                             const [lng, lat] = coords;
//                             return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
//                         },
//                         message: 'Invalid coordinates format'
//                     }
//                 }
//             },
//             lastUpdated: {
//                 type: Date
//             }
//         },

//         defaultPickupLocation: {
//             name: {
//                 type: String,
//                 trim: true,
//                 maxlength: [100, 'Location name cannot exceed 100 characters']
//             },
//             address: {
//                 type: String,
//                 trim: true,
//                 maxlength: [200, 'Address cannot exceed 200 characters']
//             },
//             coordinates: {
//                 type: {
//                     type: String,
//                     enum: ['Point'],
//                     default: 'Point'
//                 },
//                 coordinates: {
//                     type: [Number], // [longitude, latitude]
//                     validate: {
//                         validator: function(coords) {
//                             if (!coords || coords.length !== 2) return false;
//                             const [lng, lat] = coords;
//                             return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
//                         },
//                         message: 'Invalid coordinates format'
//                     }
//                 }
//             }
//         },
//         // PROFILE STATUS

//         profileStatus: {
//             type: String,
//             enum: {
//                 values: ['incomplete', 'complete', 'suspended'],
//                 message: '{VALUE} is not a valid profile status'
//             },
//             default: 'incomplete'
//         },

//         isActive: {
//             type: Boolean,
//             default: true,
//             index: true
//         },

//         // RIDE HISTORY & STATISTICS
//         rideStats: {
//             totalRides: {
//                 type: Number,
//                 default: 0,
//                 min: [0, 'Total rides cannot be negative']
//             },
//             completedRides: {
//                 type: Number,
//                 default: 0,
//                 min: [0, 'Completed rides cannot be negative']
//             },
//             cancelledRides: {
//                 type: Number,
//                 default: 0,
//                 min: [0, 'Cancelled rides cannot be negative']
//             },
//             totalSpent: {
//                 type: Number,
//                 default: 0,
//                 min: [0, 'Total spent cannot be negative']
//             },
//             averageRating: {
//                 type: Number,
//                 default: 0,
//                 min: [0, 'Rating cannot be negative'],
//                 max: [5, 'Rating cannot exceed 5']
//             }
//         },

//         // PREFERENCES & SETTINGS

//         preferences: {
//             vehiclePreference: {
//                 type: String,
//                 enum: ['car', 'bike', 'rickshaw', 'van', 'any'],
//                 default: 'any'
//             },
//             paymentMethod: {
//                 type: String,
//                 enum: ['cash', 'card', 'wallet', 'any'],
//                 default: 'cash'
//             },
//             notifications: {
//                 email: { type: Boolean, default: true },
//                 sms: { type: Boolean, default: true },
//                 push: { type: Boolean, default: true }
//             }
//         },
//         // SAVED LOCATIONS (Favorites)

//         savedLocations: [{
//             name: {
//                 type: String,
//                 required: true,
//                 trim: true,
//                 maxlength: [50, 'Location name cannot exceed 50 characters']
//             },
//             type: {
//                 type: String,
//                 enum: ['home', 'work', 'other'],
//                 default: 'other'
//             },
//             address: {
//                 type: String,
//                 required: true,
//                 trim: true,
//                 maxlength: [200, 'Address cannot exceed 200 characters']
//             },
//             coordinates: {
//                 type: {
//                     type: String,
//                     enum: ['Point'],
//                     default: 'Point'
//                 },
//                 coordinates: {
//                     type: [Number]
//                 }
//             },
//             createdAt: {
//                 type: Date,
//                 default: Date.now
//             }
//         }],
//         // AUDIT FIELDS


//         lastActive: {
//             type: Date,
//             default: Date.now,
//             index: true
//         },

//         profileCompletedAt: {
//             type: Date
//         },

//         metadata: {
//             lastIpAddress: String,
//             userAgent: String,
//             platform: {
//                 type: String,
//                 enum: ['web', 'ios', 'android', 'unknown'],
//                 default: 'unknown'
//             }
//         }
//     },
//     {
//         timestamps: true,
//         toJSON: { 
//             virtuals: true,
//             transform: function(doc, ret) {
//                 delete ret.__v;
//                 return ret;
//             }
//         },
//         toObject: { virtuals: true }
//     }
// );
// // INDEXES FOR PERFORMANCE

// CustomerSchema.index({ 'currentLocation.coordinates': '2dsphere' });
// CustomerSchema.index({ 'defaultPickupLocation.coordinates': '2dsphere' });
// CustomerSchema.index({ mobile: 1 });
// CustomerSchema.index({ profileStatus: 1, isActive: 1 });
// CustomerSchema.index({ lastActive: -1 });


// // VIRTUAL FIELDS
// // Completion percentage
// CustomerSchema.virtual('completionPercentage').get(function() {
//     let completed = 0;
//     const total = 5;

//     if (this.fullName) completed++;
//     if (this.mobile) completed++;
//     if (this.currentLocation?.address) completed++;
//     if (this.defaultPickupLocation?.address) completed++;
//     if (this.preferences?.vehiclePreference) completed++;

//     return Math.round((completed / total) * 100);
// });

// // Cancellation rate
// CustomerSchema.virtual('cancellationRate').get(function() {
//     if (this.rideStats.totalRides === 0) return 0;
//     return Math.round((this.rideStats.cancelledRides / this.rideStats.totalRides) * 100);
// });


// // INSTANCE METHODS

// /**
//  * Get safe customer data for public display (to drivers)
//  * @returns {Object} Safe customer data
//  */
// CustomerSchema.methods.getSafeCustomerData = function() {
//     return {
//         customerId: this._id,
//         fullName: this.fullName,
//         mobile: this.mobile?.slice(0, 7) + '****', // Masked mobile
//         averageRating: this.rideStats.averageRating,
//         totalRides: this.rideStats.totalRides
//     };
// };

// /**
//  * Get full customer profile for customer themselves
//  * @returns {Object} Complete customer data
//  */
// CustomerSchema.methods.getOwnProfile = function() {
//     return {
//         customerId: this._id,
//         fullName: this.fullName,
//         mobile: this.mobile,
//         currentLocation: this.currentLocation,
//         defaultPickupLocation: this.defaultPickupLocation,
//         savedLocations: this.savedLocations,
//         preferences: this.preferences,
//         rideStats: this.rideStats,
//         profileStatus: this.profileStatus,
//         completionPercentage: this.completionPercentage,
//         cancellationRate: this.cancellationRate,
//         lastActive: this.lastActive,
//         createdAt: this.createdAt
//     };
// };

// /**
//  * Update customer location
//  * @param {Number} latitude - Latitude coordinate
//  * @param {Number} longitude - Longitude coordinate
//  * @param {String} address - Address string
//  */
// CustomerSchema.methods.updateCurrentLocation = function(latitude, longitude, address) {
//     this.currentLocation = {
//         address: address || this.currentLocation?.address,
//         coordinates: {
//             type: 'Point',
//             coordinates: [longitude, latitude]
//         },
//         lastUpdated: Date.now()
//     };
//     this.lastActive = Date.now();
// };

// /**
//  * Check if profile is complete
//  * @returns {Boolean} True if profile is complete
//  */
// CustomerSchema.methods.isProfileComplete = function() {
//     return !!(
//         this.fullName &&
//         this.mobile &&
//         this.currentLocation?.address &&
//         this.defaultPickupLocation?.address
//     );
// };

// /**
//  * Mark profile as complete
//  */
// CustomerSchema.methods.markProfileComplete = function() {
//     if (this.isProfileComplete() && this.profileStatus === 'incomplete') {
//         this.profileStatus = 'complete';
//         this.profileCompletedAt = Date.now();
//     }
// };

// /**
//  * Add saved location
//  * @param {Object} locationData - Location data
//  */
// CustomerSchema.methods.addSavedLocation = function(locationData) {
//     // Limit to 10 saved locations
//     if (this.savedLocations.length >= 10) {
//         throw new Error('Maximum 10 saved locations allowed');
//     }

//     this.savedLocations.push(locationData);
// };

// /**
//  * Update activity timestamp
//  */
// CustomerSchema.methods.updateActivity = function() {
//     this.lastActive = Date.now();
// };

// // STATIC METHODS

// /**
//  * Find customer by mobile number
//  * @param {String} mobile - Mobile number
//  * @returns {Promise<Customer>}
//  */
// CustomerSchema.statics.findByMobile = function(mobile) {
//     return this.findOne({ mobile, isActive: true });
// };

// /**
//  * Find customers near a location
//  * @param {Number} longitude - Longitude coordinate
//  * @param {Number} latitude - Latitude coordinate
//  * @param {Number} maxDistance - Maximum distance in meters
//  * @returns {Promise<Customer[]>}
//  */
// CustomerSchema.statics.findNearLocation = function(longitude, latitude, maxDistance = 5000) {
//     return this.find({
//         'currentLocation.coordinates': {
//             $near: {
//                 $geometry: {
//                     type: 'Point',
//                     coordinates: [longitude, latitude]
//                 },
//                 $maxDistance: maxDistance
//             }
//         },
//         isActive: true
//     });
// };

// /**
//  * Get customer statistics
//  * @returns {Promise<Object>}
//  */
// CustomerSchema.statics.getStatistics = async function() {
//     const stats = await this.aggregate([
//         {
//             $group: {
//                 _id: null,
//                 totalCustomers: { $sum: 1 },
//                 activeCustomers: {
//                     $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
//                 },
//                 averageTotalRides: { $avg: '$rideStats.totalRides' },
//                 totalRevenue: { $sum: '$rideStats.totalSpent' }
//             }
//         }
//     ]);

//     return stats[0] || {
//         totalCustomers: 0,
//         activeCustomers: 0,
//         averageTotalRides: 0,
//         totalRevenue: 0
//     };
// };

// // PRE-SAVE MIDDLEWARE

// CustomerSchema.pre('save', function(next) {
//     // Auto-complete profile if conditions met
//     if (this.isModified() && this.isProfileComplete()) {
//         this.markProfileComplete();
//     }

//     // Update last active timestamp
//     if (this.isModified() && !this.isNew) {
//         this.lastActive = Date.now();
//     }

//     next();
// });


// // POST-SAVE MIDDLEWARE

// CustomerSchema.post('save', function(doc) {
//     console.log(`✅ Customer profile ${doc._id} saved successfully`);
// });

// // EXPORT MODEL

// module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);


const mongoose = require('mongoose');

/**
 * Customer Schema
 * Represents a customer profile in the ride-sharing application
 * 
 * @typedef {Object} Customer
 * @property {ObjectId} user - Reference to User model (one-to-one)
 * @property {Object} preferences - Customer preferences
 * @property {Object} statistics - Customer ride statistics
 * @property {Array} savedAddresses - Customer saved locations
 */

const CustomerSchema = new mongoose.Schema(
    {
        // ============================================
        // REFERENCE TO USER ACCOUNT
        // ============================================
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            unique: true,
            index: true
        },

        // ============================================
        // CUSTOMER PREFERENCES
        // ============================================
        preferences: {
            preferredVehicleType: {
                type: String,
                enum: ['car', 'bike', 'rickshaw', 'van', 'any'],
                default: 'any'
            },

            preferredPaymentMethod: {
                type: String,
                enum: ['cash', 'card', 'wallet'],
                default: 'cash'
            },

            notifications: {
                email: {
                    type: Boolean,
                    default: true
                },
                sms: {
                    type: Boolean,
                    default: true
                },
                push: {
                    type: Boolean,
                    default: true
                }
            }
        },

        // ============================================
        // SAVED ADDRESSES
        // ============================================
        savedAddresses: [{
            label: {
                type: String,
                enum: ['home', 'work', 'other'],
                required: true
            },
            address: {
                type: String,
                required: true
            },
            location: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: {
                    type: [Number], // [longitude, latitude]
                    required: true
                }
            },
            isPrimary: {
                type: Boolean,
                default: false
            }
        }],

        // ============================================
        // CUSTOMER STATISTICS
        // ============================================
        statistics: {
            totalRides: {
                type: Number,
                default: 0,
                min: 0
            },

            completedRides: {
                type: Number,
                default: 0,
                min: 0
            },

            cancelledRides: {
                type: Number,
                default: 0,
                min: 0
            },

            totalSpent: {
                type: Number,
                default: 0,
                min: 0
            },

            averageRating: {
                type: Number,
                default: 0,
                min: 0,
                max: 5
            },

            totalRatingsGiven: {
                type: Number,
                default: 0,
                min: 0
            }
        },

        // ============================================
        // CUSTOMER STATUS
        // ============================================
        isActive: {
            type: Boolean,
            default: true
        },

        accountStatus: {
            type: String,
            enum: ['active', 'suspended', 'blocked'],
            default: 'active'
        },

        // ============================================
        // WALLET & PAYMENT
        // ============================================
        wallet: {
            balance: {
                type: Number,
                default: 0,
                min: 0
            },
            currency: {
                type: String,
                default: 'PKR'
            }
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// ============================================
// INDEXES
// ============================================
//CustomerSchema.index({ user: 1 });
CustomerSchema.index({ accountStatus: 1 });
CustomerSchema.index({ 'savedAddresses.location': '2dsphere' });

// ============================================
// VIRTUAL PROPERTIES
// ============================================

// Virtual for ride completion rate
CustomerSchema.virtual('rideCompletionRate').get(function () {
    if (this.statistics.totalRides === 0) return 0;
    return ((this.statistics.completedRides / this.statistics.totalRides) * 100).toFixed(2);
});

// Virtual for cancellation rate
CustomerSchema.virtual('cancellationRate').get(function () {
    if (this.statistics.totalRides === 0) return 0;
    return ((this.statistics.cancelledRides / this.statistics.totalRides) * 100).toFixed(2);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add a saved address
 * @param {Object} addressData - Address data
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.addSavedAddress = async function (addressData) {
    // If setting as primary, unset other primary addresses
    if (addressData.isPrimary) {
        this.savedAddresses.forEach(addr => {
            addr.isPrimary = false;
        });
    }

    this.savedAddresses.push(addressData);
    return await this.save();
};

/**
 * Update saved address
 * @param {String} addressId - Address ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.updateSavedAddress = async function (addressId, updateData) {
    const address = this.savedAddresses.id(addressId);
    
    if (!address) {
        throw new Error('Address not found');
    }

    // If setting as primary, unset other primary addresses
    if (updateData.isPrimary) {
        this.savedAddresses.forEach(addr => {
            if (addr._id.toString() !== addressId) {
                addr.isPrimary = false;
            }
        });
    }

    Object.assign(address, updateData);
    return await this.save();
};

/**
 * Remove saved address
 * @param {String} addressId - Address ID
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.removeSavedAddress = async function (addressId) {
    this.savedAddresses.pull(addressId);
    return await this.save();
};

/**
 * Update ride statistics
 * @param {String} status - Ride status ('completed' or 'cancelled')
 * @param {Number} amount - Ride amount
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.updateRideStats = async function (status, amount = 0) {
    this.statistics.totalRides += 1;

    if (status === 'completed') {
        this.statistics.completedRides += 1;
        this.statistics.totalSpent += amount;
    } else if (status === 'cancelled') {
        this.statistics.cancelledRides += 1;
    }

    return await this.save();
};

/**
 * Update customer rating
 * @param {Number} rating - Rating given (1-5)
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.updateRating = async function (rating) {
    const currentTotal = this.statistics.averageRating * this.statistics.totalRatingsGiven;
    this.statistics.totalRatingsGiven += 1;
    this.statistics.averageRating = (currentTotal + rating) / this.statistics.totalRatingsGiven;
    
    return await this.save();
};

/**
 * Add money to wallet
 * @param {Number} amount - Amount to add
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.addToWallet = async function (amount) {
    this.wallet.balance += amount;
    return await this.save();
};

/**
 * Deduct money from wallet
 * @param {Number} amount - Amount to deduct
 * @returns {Promise<Customer>}
 */
CustomerSchema.methods.deductFromWallet = async function (amount) {
    if (this.wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
    }

    this.wallet.balance -= amount;
    return await this.save();
};

/**
 * Check if customer can book rides
 * @returns {Boolean}
 */
CustomerSchema.methods.canBookRides = function () {
    return this.isActive && this.accountStatus === 'active';
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find active customers
 * @returns {Promise<Array>}
 */
CustomerSchema.statics.findActiveCustomers = function () {
    return this.find({
        isActive: true,
        accountStatus: 'active'
    }).populate('user', 'fullname email mobile');
};

/**
 * Get customer statistics summary
 * @returns {Promise<Object>}
 */
CustomerSchema.statics.getStatisticsSummary = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                activeCustomers: {
                    $sum: { $cond: [{ $eq: ['$accountStatus', 'active'] }, 1, 0] }
                },
                totalRides: { $sum: '$statistics.totalRides' },
                totalRevenue: { $sum: '$statistics.totalSpent' }
            }
        }
    ]);

    return stats[0] || {
        totalCustomers: 0,
        activeCustomers: 0,
        totalRides: 0,
        totalRevenue: 0
    };
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save middleware
CustomerSchema.pre('save', function (next) {
    // Ensure only one primary address
    const primaryAddresses = this.savedAddresses.filter(addr => addr.isPrimary);
    
    if (primaryAddresses.length > 1) {
        // Keep only the first primary address
        this.savedAddresses.forEach((addr, index) => {
            if (index > 0 && addr.isPrimary) {
                addr.isPrimary = false;
            }
        });
    }

});

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);