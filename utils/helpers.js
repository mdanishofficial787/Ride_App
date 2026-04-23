// Calculate distance between two coordinates (Haversine formula)
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Get status message
exports.getStatusMessage = (status) => {
    const messages = {
        pending: 'Your profile is under review. You will be notified once verified.',
        approved: 'Your profile has been approved! You can now accept rides.',
        rejected: 'Your profile has been rejected. Please check the rejection reason and resubmit.'
    };
    return messages[status] || 'Unknown status';
};

// Get next steps based on status
exports.getNextSteps = (status) => {
    const steps = {
        pending: [
            'Wait for admin verification',
            'You will receive a notification once your profile is reviewed',
            'Verification typically takes 24-48 hours'
        ],
        approved: [
            'You can now start accepting rides',
            'Make sure to update your availability status',
            'Ensure your location services are enabled'
        ],
        rejected: [
            'Review the rejection reason carefully',
            'Update your documents if needed',
            'Contact support if you need clarification',
            'Resubmit your profile after corrections'
        ]
    };
    return steps[status] || [];
};

// Format error response
exports.errorResponse = (message, field = null, additionalData = {}) => {
    const response = {
        success: false,
        message
    };
    if (field) response.field = field;
    return { ...response, ...additionalData };
};

// Format success response
exports.successResponse = (message, data = null) => {
    const response = {
        success: true,
        message
    };
    if (data) response.data = data;
    return response;
};