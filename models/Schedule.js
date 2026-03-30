const mongoose = require('mongoose');

/**
 * Schedule Schema
 * Represents a customer's weekly travel schedule
 * 
 * @typedef {Object} Schedule
 * @property {ObjectId} customer - Reference to Customer model
 * @property {String} scheduleType - Type of weekly schedule
 * @property {Date} startDate - When schedule becomes active
 * @property {Date} endDate - Optional end date for schedule
 * @property {Boolean} isActive - Whether schedule is currently active
 */

const ScheduleSchema = new mongoose.Schema(
    {
        // ============================================
        // REFERENCE TO CUSTOMER
        // ============================================
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: [true, 'Customer reference is required'],
            index: true
        },

        // ============================================
        // SCHEDULE CONFIGURATION
        // ============================================
        scheduleType: {
            type: String,
            enum: {
                values: ['monday-friday', 'monday-saturday', 'everyday', 'custom'],
                message: '{VALUE} is not a valid schedule type'
            },
            required: [true, 'Schedule type is required']
        },

        // ============================================
        // SCHEDULE TIMING
        // ============================================
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            validate: {
                validator: function(value) {
                    // Start date must be today or in the future
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return value >= today;
                },
                message: 'Start date cannot be in the past'
            }
        },

        endDate: {
            type: Date,
            default: null,
            validate: {
                validator: function(value) {
                    // If endDate exists, it must be after startDate
                    if (!value) return true;
                    return value > this.startDate;
                },
                message: 'End date must be after start date'
            }
        },

        // ============================================
        // SCHEDULE STATUS
        // ============================================
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        // ============================================
        // SCHEDULE DETAILS
        // ============================================
        scheduleName: {
            type: String,
            trim: true,
            maxlength: [100, 'Schedule name cannot exceed 100 characters']
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters']
        },

        // ============================================
        // RECURRENCE PATTERN
        // ============================================
        recurrence: {
            // Days of week this schedule applies to
            daysOfWeek: {
                type: [Number], // 0=Sunday, 1=Monday, ..., 6=Saturday
                validate: {
                    validator: function(arr) {
                        return arr.every(day => day >= 0 && day <= 6);
                    },
                    message: 'Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday)'
                }
            },

            // Specific dates to exclude (holidays, exceptions)
            excludeDates: [{
                type: Date
            }]
        },

        // ============================================
        // RIDE DETAILS (Default values for recurring rides)
        // ============================================
        defaultRideDetails: {
            pickupLocation: {
                address: String,
                coordinates: {
                    type: [Number], // [longitude, latitude]
                    index: '2dsphere'
                }
            },

            dropoffLocation: {
                address: String,
                coordinates: {
                    type: [Number] // [longitude, latitude]
                }
            },

            preferredTime: {
                type: String, // Format: "HH:MM" (24-hour)
                validate: {
                    validator: function(value) {
                        if (!value) return true;
                        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
                    },
                    message: 'Invalid time format. Use HH:MM (24-hour format)'
                }
            },

            vehicleType: {
                type: String,
                enum: ['car', 'bike', 'rickshaw', 'van', 'any'],
                default: 'any'
            }
        },

        // ============================================
        // STATISTICS
        // ============================================
        statistics: {
            totalRidesGenerated: {
                type: Number,
                default: 0,
                min: 0
            },

            totalRidesCompleted: {
                type: Number,
                default: 0,
                min: 0
            },

            lastRideDate: {
                type: Date
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
ScheduleSchema.index({ customer: 1, isActive: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1 });
ScheduleSchema.index({ scheduleType: 1 });
//ScheduleSchema.index({ 'defaultRideDetails.pickupLocation.coordinates': '2dsphere' });

// ============================================
// VIRTUAL PROPERTIES
// ============================================

/**
 * Check if schedule is currently valid (within date range)
 */
ScheduleSchema.virtual('isCurrentlyValid').get(function () {
    const now = new Date();
    const isAfterStart = now >= this.startDate;
    const isBeforeEnd = !this.endDate || now <= this.endDate;
    
    return this.isActive && isAfterStart && isBeforeEnd;
});

/**
 * Get days remaining in schedule
 */
ScheduleSchema.virtual('daysRemaining').get(function () {
    if (!this.endDate) return null; // Indefinite schedule
    
    const now = new Date();
    const diff = this.endDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return days > 0 ? days : 0;
});

/**
 * Get schedule completion rate
 */
ScheduleSchema.virtual('completionRate').get(function () {
    if (this.statistics.totalRidesGenerated === 0) return 0;
    return ((this.statistics.totalRidesCompleted / this.statistics.totalRidesGenerated) * 100).toFixed(2);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if schedule applies to a specific date
 * @param {Date} date - Date to check
 * @returns {Boolean}
 */
ScheduleSchema.methods.appliesTo = function (date) {
    // Check if date is within schedule range
    if (date < this.startDate) return false;
    if (this.endDate && date > this.endDate) return false;

    // Check if date is excluded
    const dateStr = date.toDateString();
    const isExcluded = this.recurrence.excludeDates.some(
        excludeDate => excludeDate.toDateString() === dateStr
    );
    if (isExcluded) return false;

    // Check if day of week matches
    const dayOfWeek = date.getDay();
    
    if (this.recurrence.daysOfWeek && this.recurrence.daysOfWeek.length > 0) {
        return this.recurrence.daysOfWeek.includes(dayOfWeek);
    }

    // Default: apply to all days if no specific days configured
    return true;
};

/**
 * Deactivate this schedule
 * @returns {Promise<Schedule>}
 */
ScheduleSchema.methods.deactivate = async function () {
    this.isActive = false;
    return await this.save();
};

/**
 * Activate this schedule
 * @returns {Promise<Schedule>}
 */
ScheduleSchema.methods.activate = async function () {
    this.isActive = true;
    return await this.save();
};

/**
 * Update ride statistics
 * @param {String} status - 'generated' or 'completed'
 * @returns {Promise<Schedule>}
 */
ScheduleSchema.methods.updateStats = async function (status) {
    if (status === 'generated') {
        this.statistics.totalRidesGenerated += 1;
    } else if (status === 'completed') {
        this.statistics.totalRidesCompleted += 1;
        this.statistics.lastRideDate = new Date();
    }
    
    return await this.save();
};

/**
 * Add exclude date
 * @param {Date} date - Date to exclude
 * @returns {Promise<Schedule>}
 */
ScheduleSchema.methods.addExcludeDate = async function (date) {
    if (!this.recurrence.excludeDates) {
        this.recurrence.excludeDates = [];
    }
    
    this.recurrence.excludeDates.push(date);
    return await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find active schedules for a customer
 * @param {String} customerId - Customer ID
 * @returns {Promise<Array>}
 */
ScheduleSchema.statics.findActiveSchedules = function (customerId) {
    return this.find({
        customer: customerId,
        isActive: true
    }).sort({ createdAt: -1 });
};

/**
 * Find schedules that apply to a specific date
 * @param {String} customerId - Customer ID
 * @param {Date} date - Date to check
 * @returns {Promise<Array>}
 */
ScheduleSchema.statics.findSchedulesForDate = async function (customerId, date) {
    const schedules = await this.find({
        customer: customerId,
        isActive: true,
        startDate: { $lte: date },
        $or: [
            { endDate: null },
            { endDate: { $gte: date } }
        ]
    });

    // Filter by day of week
    return schedules.filter(schedule => schedule.appliesTo(date));
};

/**
 * Get schedule statistics summary
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>}
 */
ScheduleSchema.statics.getStatisticsSummary = async function (customerId) {
    const stats = await this.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId) } },
        {
            $group: {
                _id: null,
                totalSchedules: { $sum: 1 },
                activeSchedules: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                },
                totalRidesGenerated: { $sum: '$statistics.totalRidesGenerated' },
                totalRidesCompleted: { $sum: '$statistics.totalRidesCompleted' }
            }
        }
    ]);

    return stats[0] || {
        totalSchedules: 0,
        activeSchedules: 0,
        totalRidesGenerated: 0,
        totalRidesCompleted: 0
    };
};

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Pre-save: Set days of week based on schedule type
 */
ScheduleSchema.pre('save', function () {
    // Auto-populate daysOfWeek based on scheduleType
    if (this.isModified('scheduleType') || this.isNew) {
        switch (this.scheduleType) {
            case 'monday-friday':
                this.recurrence.daysOfWeek = [1, 2, 3, 4, 5]; // Mon-Fri
                break;
            case 'monday-saturday':
                this.recurrence.daysOfWeek = [1, 2, 3, 4, 5, 6]; // Mon-Sat
                break;
            case 'everyday':
                this.recurrence.daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Every day
                break;
            case 'custom':
                // Keep existing or empty (to be set manually)
                if (!this.recurrence.daysOfWeek) {
                    this.recurrence.daysOfWeek = [];
                }
                break;
        }
    }
});

/**
 * Pre-save: Validate only one active schedule per customer (optional business rule)
 */
ScheduleSchema.pre('save', async function () {
    // Skip if schedule is not active or if it's an update to same schedule
    if (!this.isActive || !this.isNew) return;

    // Check for other active schedules
    const Schedule = mongoose.model('Schedule');
    const activeSchedules = await Schedule.countDocuments({
        customer: this.customer,
        isActive: true,
        _id: { $ne: this._id }
    });

    // This business rule can be enabled/disabled as needed
    // Uncomment to enforce single active schedule rule:
    /*
    if (activeSchedules > 0) {
        throw new Error('Customer already has an active schedule. Please deactivate it first.');
    }
    */
});

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);