const express = require('express');
const adminController = require('../controllers/adminController');

const { protect, authorizeUserType } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin user type
router.use(protect);
router.use(authorizeUserType('admin'));

// DASHBOARD 
router.get('/dashboard', adminController.getDashboard);

// Statistics
router.get('/drivers/stats', adminController.getVerificationStats);

// Driver management
router.get('/drivers/pending', adminController.getPendingDrivers);
router.get('/drivers', adminController.getAllDrivers);
router.get('/drivers/:id', adminController.getDriverById);// basic info only
router.get('/drivers/:id/full', adminController.getDriverFullDetails);  // - Full sensitive data
router.get('/drivers/:id/access-log', adminController.getSensitiveAccessLog);  //audit log
router.put('/drivers/:id/approve', adminController.approveDriver);
router.put('/drivers/:id/reject', adminController.rejectDriver);
router.put('/drivers/:id/suspend', adminController.suspendDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

//customer management
router.get('/customers/stats', adminController.getCustomerStats);
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:id', adminController.getCustomerById);
router.put('/customers/:id/suspend', adminController.suspendCustomer);
router.put('/customers/:id/activate', adminController.activateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);

module.exports = router;