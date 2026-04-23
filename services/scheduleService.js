/**
 * Schedule Service Layer
 * Handles business logic for schedule operations
 */

const Schedule = require('../models/Schedule');
const Customer = require('../models/Customer');
const {
    NotFoundError,
    ConflictError,
    ValidationError,
    ForbiddenError
} = require('../utils/errorHandler');
const Validators = require('../utils/validators');

class ScheduleService {
    /**
     * Create weekly schedule
     * @param {String} userId - User ID from authenticated token
     * @param {Object} scheduleData - Schedule data
     * @returns {Promise<Object>}
     */
    static async createSchedule(userId, scheduleData) {
        // Find customer profile
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        // Check if customer can book rides
        if (!customer.canBookRides()) {
            throw new ForbiddenError('Your account is not active. Cannot create schedules.');
        }

        // Validate schedule data
        this.validateScheduleData(scheduleData);

        // Optional: Check for existing active schedules
        const activeSchedules = await Schedule.findActiveSchedules(customer._id);
        
        // Business rule: Allow multiple active schedules or enforce single schedule
        // Uncomment to enforce single active schedule:
        /*
        if (activeSchedules.length > 0) {
            throw new ConflictError('You already have an active schedule. Please deactivate it first.');
        }
        */

        // Create schedule
        const schedule = await Schedule.create({
            customer: customer._id,
            ...scheduleData,
            isActive: true
        });

        // Populate customer data
        await schedule.populate('customer');

        return schedule;
    }

    /**
     * Get customer schedules
     * @param {String} userId - User ID
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>}
     */
    static async getSchedules(userId, filters = {}) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const query = { customer: customer._id };

        // Apply filters
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive === 'true';
        }

        if (filters.scheduleType) {
            query.scheduleType = filters.scheduleType;
        }

        const schedules = await Schedule.find(query)
            .sort({ createdAt: -1 })
            .populate('customer');

        return schedules;
    }

    /**
     * Get schedule by ID
     * @param {String} userId - User ID
     * @param {String} scheduleId - Schedule ID
     * @returns {Promise<Object>}
     */
    static async getScheduleById(userId, scheduleId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const schedule = await Schedule.findOne({
            _id: scheduleId,
            customer: customer._id
        }).populate('customer');

        if (!schedule) {
            throw new NotFoundError('Schedule');
        }

        return schedule;
    }

    /**
     * Update schedule
     * @param {String} userId - User ID
     * @param {String} scheduleId - Schedule ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>}
     */
    static async updateSchedule(userId, scheduleId, updateData) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const schedule = await Schedule.findOne({
            _id: scheduleId,
            customer: customer._id
        });

        if (!schedule) {
            throw new NotFoundError('Schedule');
        }

        // Validate update data
        if (updateData.startDate || updateData.endDate || updateData.scheduleType) {
            this.validateScheduleData({ ...schedule.toObject(), ...updateData });
        }

        // Update allowed fields
        const allowedUpdates = [
            'scheduleType',
            'startDate',
            'endDate',
            'scheduleName',
            'description',
            'defaultRideDetails'
        ];

        allowedUpdates.forEach(field => {
            if (updateData[field] !== undefined) {
                schedule[field] = updateData[field];
            }
        });

        await schedule.save();
        await schedule.populate('customer');

        return schedule;
    }

    /**
     * Delete schedule
     * @param {String} userId - User ID
     * @param {String} scheduleId - Schedule ID
     * @returns {Promise<Boolean>}
     */
    static async deleteSchedule(userId, scheduleId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const schedule = await Schedule.findOne({
            _id: scheduleId,
            customer: customer._id
        });

        if (!schedule) {
            throw new NotFoundError('Schedule');
        }

        await Schedule.findByIdAndDelete(schedule._id);
        return true;
    }

    /**
     * Activate schedule
     * @param {String} userId - User ID
     * @param {String} scheduleId - Schedule ID
     * @returns {Promise<Object>}
     */
    static async activateSchedule(userId, scheduleId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const schedule = await Schedule.findOne({
            _id: scheduleId,
            customer: customer._id
        });

        if (!schedule) {
            throw new NotFoundError('Schedule');
        }

        // Optional: Deactivate other schedules
        // Uncomment to enforce single active schedule:
        /*
        await Schedule.updateMany(
            { customer: customer._id, _id: { $ne: scheduleId } },
            { isActive: false }
        );
        */

        await schedule.activate();
        await schedule.populate('customer');

        return schedule;
    }
    /**
     * Get active schedules for booking service
     * @param {String} userId - User ID
     * @returns {Promise<Array>}
     */
    static async getActiveSchedulesForBooking(userId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const now = new Date();
        
        // Find schedules that are:
        // 1. Active
        // 2. Started (startDate <= now)
        // 3. Not ended (endDate is null or endDate >= now)
        const activeSchedules = await Schedule.find({
            customer: customer._id,
            isActive: true,
            startDate: { $lte: now },
            $or: [
                { endDate: null },
                { endDate: { $gte: now } }
            ]
        }).sort({ createdAt: -1 });

        return activeSchedules.map(schedule => ({
            scheduleId: schedule._id,
            customerId: customer._id,
            scheduleType: schedule.scheduleType,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            isActive: schedule.isActive,
            daysOfWeek: schedule.recurrence.daysOfWeek,
            defaultRideDetails: schedule.defaultRideDetails,
            createdAt: schedule.createdAt
        }));
    }

    /**
     * Deactivate schedule
     * @param {String} userId - User ID
     * @param {String} scheduleId - Schedule ID
     * @returns {Promise<Object>}
     */
    static async deactivateSchedule(userId, scheduleId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const schedule = await Schedule.findOne({
            _id: scheduleId,
            customer: customer._id
        });

        if (!schedule) {
            throw new NotFoundError('Schedule');
        }

        await schedule.deactivate();
        await schedule.populate('customer');

        return schedule;
    }

    /**
     * Get schedule statistics
     * @param {String} userId - User ID
     * @returns {Promise<Object>}
     */
    static async getStatistics(userId) {
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            throw new NotFoundError('Customer profile');
        }

        const stats = await Schedule.getStatisticsSummary(customer._id);
        return stats;
    }

    /**
     * Validate schedule data
     * @param {Object} data - Schedule data
     * @throws {ValidationError}
     */
    static validateScheduleData(data) {
        const errors = {};

        // Validate schedule type
        const validTypes = ['monday-friday', 'monday-saturday', 'everyday', 'custom'];
        if (data.scheduleType && !validTypes.includes(data.scheduleType)) {
            errors.scheduleType = `Invalid schedule type. Must be one of: ${validTypes.join(', ')}`;
        }

        // Validate start date
        if (data.startDate) {
            const startDate = new Date(data.startDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                errors.startDate = 'Start date cannot be in the past';
            }
        }

        // Validate end date
        if (data.endDate && data.startDate) {
            const endDate = new Date(data.endDate);
            const startDate = new Date(data.startDate);

            if (endDate <= startDate) {
                errors.endDate = 'End date must be after start date';
            }
        }

        // Validate preferred time format
        if (data.defaultRideDetails?.preferredTime) {
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(data.defaultRideDetails.preferredTime)) {
                errors.preferredTime = 'Invalid time format. Use HH:MM (24-hour format)';
            }
        }

        if (Object.keys(errors).length > 0) {
            throw new ValidationError('Validation failed', errors);
        }
    }
}
//get active schedules for booking service


module.exports = ScheduleService;