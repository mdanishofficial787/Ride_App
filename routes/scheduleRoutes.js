/**
 * Schedule Routes
 * Defines all schedule-related endpoints
 */

const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { protect, authorizeUserType } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and customer user type
router.use(protect);
router.use(authorizeUserType('customer'));

// Statistics route (must be before /:scheduleId)
router.get('/statistics', scheduleController.getStatistics);

// Schedule CRUD routes
router.post('/', scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.get('/:scheduleId', scheduleController.getScheduleById);
router.put('/:scheduleId', scheduleController.updateSchedule);
router.delete('/:scheduleId', scheduleController.deleteSchedule);

// Activate/Deactivate routes
router.put('/:scheduleId/activate', scheduleController.activateSchedule);
router.put('/:scheduleId/deactivate', scheduleController.deactivateSchedule);

module.exports = router;