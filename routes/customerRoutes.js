// const express = require('express');
// const {
//     createCustomerProfile,
//     getCustomerProfile,
//     updateCustomerProfile,
//     addSavedLocation,
//     getSavedLocations,
//     deleteSavedLocation,
//     getProfileStats,
//     deleteCustomerProfile
// } = require('../controllers/customerController');

// const { protect, authorizeUserType } = require('../middleware/auth');

// const router = express.Router();

// // All routes require authentication as customer
// router.use(protect);
// router.use(authorizeUserType('customer'));

// // Profile routes
// router.route('/profile')
//     .post(createCustomerProfile)
//     .get(getCustomerProfile)
//     .put(updateCustomerProfile)
//     .delete(deleteCustomerProfile);

// // Saved locations
// router.route('/saved-locations')
//     .get(getSavedLocations)
//     .post(addSavedLocation);

// router.delete('/saved-locations/:locationId', deleteSavedLocation);

// // Statistics
// router.get('/stats', getProfileStats);

// module.exports = router;

const express = require('express');
const customerController = require('../controllers/customerController');
const { protect, authorizeUserType } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// CUSTOMER PROFILE ROUTES
// ============================================

// Create profile
router.post(
    '/profile',
    authorizeUserType('customer'),
    customerController.createProfile
);

// Get profile
router.get(
    '/profile',
    authorizeUserType('customer'),
    customerController.getProfile
);

// Delete profile
router.delete(
    '/profile',
    authorizeUserType('customer'),
    customerController.deleteProfile
);

// Update preferences
router.put(
    '/profile/preferences',
    authorizeUserType('customer'),
    customerController.updatePreferences
);

// Get statistics
router.get(
    '/profile/statistics',
    authorizeUserType('customer'),
    customerController.getStatistics
);

// ============================================
// SAVED ADDRESSES ROUTES
// ============================================

// Add address
router.post(
    '/profile/addresses',
    authorizeUserType('customer'),
    customerController.addSavedAddress
);

// Update address
router.put(
    '/profile/addresses/:addressId',
    authorizeUserType('customer'),
    customerController.updateSavedAddress
);

// Delete address
router.delete(
    '/profile/addresses/:addressId',
    authorizeUserType('customer'),
    customerController.removeSavedAddress
);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all customers
router.get(
    '/',
    authorizeUserType('admin'),
    customerController.getAllCustomers
);

// Get customer by ID
router.get(
    '/:customerId',
    authorizeUserType('admin'),
    customerController.getCustomerById
);

module.exports = router;