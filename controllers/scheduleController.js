/**
 * Schedule Controller
 * Handles HTTP requests and responses for schedule operations
 */

const ScheduleService = require('../services/scheduleService');
const ResponseHandler = require('../utils/responseHandler');

/**
 * @desc    Create weekly schedule
 * @route   POST /api/schedules
 * @access  Private (Customer)
 */
exports.createSchedule = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const scheduleData = req.body;

        const schedule = await ScheduleService.createSchedule(userId, scheduleData);

        return ResponseHandler.created(
            res,
            'Weekly schedule created successfully',
            {
                scheduleId: schedule._id,
                scheduleType: schedule.scheduleType,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                isActive: schedule.isActive,
                scheduleName: schedule.scheduleName,
                description: schedule.description,
                recurrence: schedule.recurrence,
                defaultRideDetails: schedule.defaultRideDetails,
                statistics: schedule.statistics,
                createdAt: schedule.createdAt
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all customer schedules
 * @route   GET /api/schedules
 * @access  Private (Customer)
 */
exports.getSchedules = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { isActive, scheduleType } = req.query;

        const schedules = await ScheduleService.getSchedules(userId, {
            isActive,
            scheduleType
        });

        return ResponseHandler.success(
            res,
            200,
            'Schedules retrieved successfully',
            {
                count: schedules.length,
                schedules: schedules.map(schedule => ({
                    scheduleId: schedule._id,
                    scheduleType: schedule.scheduleType,
                    scheduleName: schedule.scheduleName,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    isActive: schedule.isActive,
                    isCurrentlyValid: schedule.isCurrentlyValid,
                    daysRemaining: schedule.daysRemaining,
                    recurrence: schedule.recurrence,
                    defaultRideDetails: schedule.defaultRideDetails,
                    statistics: {
                        ...schedule.statistics.toObject(),
                        completionRate: schedule.completionRate
                    },
                    createdAt: schedule.createdAt,
                    updatedAt: schedule.updatedAt
                }))
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get schedule by ID
 * @route   GET /api/schedules/:scheduleId
 * @access  Private (Customer)
 */
exports.getScheduleById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { scheduleId } = req.params;

        const schedule = await ScheduleService.getScheduleById(userId, scheduleId);

        return ResponseHandler.success(
            res,
            200,
            'Schedule retrieved successfully',
            {
                schedule: {
                    scheduleId: schedule._id,
                    scheduleType: schedule.scheduleType,
                    scheduleName: schedule.scheduleName,
                    description: schedule.description,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    isActive: schedule.isActive,
                    isCurrentlyValid: schedule.isCurrentlyValid,
                    daysRemaining: schedule.daysRemaining,
                    recurrence: schedule.recurrence,
                    defaultRideDetails: schedule.defaultRideDetails,
                    statistics: {
                        ...schedule.statistics.toObject(),
                        completionRate: schedule.completionRate
                    },
                    createdAt: schedule.createdAt,
                    updatedAt: schedule.updatedAt
                }
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update schedule
 * @route   PUT /api/schedules/:scheduleId
 * @access  Private (Customer)
 */
exports.updateSchedule = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { scheduleId } = req.params;
        const updateData = req.body;

        const schedule = await ScheduleService.updateSchedule(userId, scheduleId, updateData);

        return ResponseHandler.success(
            res,
            200,
            'Schedule updated successfully',
            {
                scheduleId: schedule._id,
                scheduleType: schedule.scheduleType,
                scheduleName: schedule.scheduleName,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                isActive: schedule.isActive,
                recurrence: schedule.recurrence,
                defaultRideDetails: schedule.defaultRideDetails,
                updatedAt: schedule.updatedAt
            }
        );
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Get active schedules for booking service
 * @route   GET /api/schedules/active-for-booking
 * @access  Private (Customer)
 */
exports.getActiveSchedulesForBooking = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const schedules = await ScheduleService.getActiveSchedulesForBooking(userId);

        return ResponseHandler.success(
            res,
            200,
            schedules.length > 0 
                ? 'Active schedules retrieved for booking'
                : 'No active schedules found. Manual booking inputs required.',
            {
                hasActiveSchedules: schedules.length > 0,
                count: schedules.length,
                schedules
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete schedule
 * @route   DELETE /api/schedules/:scheduleId
 * @access  Private (Customer)
 */
exports.deleteSchedule = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { scheduleId } = req.params;

        await ScheduleService.deleteSchedule(userId, scheduleId);

        return ResponseHandler.success(
            res,
            200,
            'Schedule deleted successfully'
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Activate schedule
 * @route   PUT /api/schedules/:scheduleId/activate
 * @access  Private (Customer)
 */
exports.activateSchedule = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { scheduleId } = req.params;

        const schedule = await ScheduleService.activateSchedule(userId, scheduleId);

        return ResponseHandler.success(
            res,
            200,
            'Schedule activated successfully',
            {
                scheduleId: schedule._id,
                isActive: schedule.isActive,
                updatedAt: schedule.updatedAt
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Deactivate schedule
 * @route   PUT /api/schedules/:scheduleId/deactivate
 * @access  Private (Customer)
 */
exports.deactivateSchedule = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { scheduleId } = req.params;

        const schedule = await ScheduleService.deactivateSchedule(userId, scheduleId);

        return ResponseHandler.success(
            res,
            200,
            'Schedule deactivated successfully',
            {
                scheduleId: schedule._id,
                isActive: schedule.isActive,
                updatedAt: schedule.updatedAt
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get schedule statistics
 * @route   GET /api/schedules/statistics
 * @access  Private (Customer)
 */
exports.getStatistics = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const stats = await ScheduleService.getStatistics(userId);

        return ResponseHandler.success(
            res,
            200,
            'Statistics retrieved successfully',
            { statistics: stats }
        );
    } catch (error) {
        next(error);
    }
};