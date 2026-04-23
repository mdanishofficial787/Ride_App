const mongoose = require('mongoose');
const { encrypt, decrypt, maskCNIC } = require('../utils/encryption');

const DriverSchema = new mongoose.Schema(
    {
        // Reference to User account
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            unique: true
        },

        
        // PERSONAL INFORMATION
        

        cnic: {
            type: String,
            required: [true, 'Please provide CNIC number'],
            unique: true,
            match: [/^[0-9]{13}$/, 'CNIC must be exactly 13 digits'],
            trim: true,
            select: false  //never auto include in queries
        },

        cnicEncrypted: {
            type: String,
            select: false // encrypted version for extra security
        },
        
        // PERSONAL DOCUMENTS   admin access only
        

        documents: {
            // Driver Image
            driverImage: {
                type: String,
                required: [true, 'Please upload driver image'],
                select: false
            },

            // CNIC Documents
            cnicFront: {
                type: String,
                required: [true, 'Please upload CNIC front image'],
                select: false
            },

            cnicBack: {
                type: String,
                required: [true, 'Please upload CNIC back image'],
                select: false
            },

            // Driving License
            drivingLicenseFront: {
                type: String,
                required: [true, 'Please upload driving license front image'],
                select: false
            },

            drivingLicenseBack: {
                type: String,
                required: [true, 'Please upload driving license back image'],
                select: false
            }
        },

        
        // VEHICLE INFORMATION  --public for customers
        

        vehicleType: {
            type: String,
            enum: ['car', 'bike', 'rickshaw', 'van'],
            required: [true, 'Please select vehicle type']
        },

        vehicleLicenseNumber: {
            type: String,
            required: [true, 'Please provide vehicle license number'],
            unique: true,
            uppercase: true,
            trim: true,
            select: false //hide from customers
        },

        vehicleRegistrationNumber: {
            type: String,
            required: [true, 'Please provide vehicle registration number'],
            unique: true,
            uppercase: true,
            trim: true,
            select: false
        },

        
        // VEHICLE DOCUMENTS
        

        vehicleDocuments: {
            // Vehicle Registration Document
            registrationDocument: {
                type: String,
                required: [true, 'Please upload vehicle registration document'],
                select: false
            },

            // Vehicle Images (4 angles)
            vehicleFrontImage: {
                type: String,
                required: [true, 'Please upload vehicle front image'],
                select: false
            },

            vehicleBackImage: {
                type: String,
                required: [true, 'Please upload vehicle back image'],
                select: false
            },

            vehicleLeftImage: {
                type: String,
                required: [true, 'Please upload vehicle left side image'],
                select: FinalizationRegistry
            },

            vehicleRightImage: {
                type: String,
                required: [true, 'Please upload vehicle right side image'],
                select: false
            }
        },

        //verification status of documents
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },

        rejectionReason: {
            type: String,
            default: null
        },

        statusHistory: [{
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected']
            },
            changeAt: {
                type: Date,
                default: Date.now
            },
            changeBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reason: String
        }],

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: {
            type: Date
        },
        rejectedAt: {
            type: Date
        },

        
        // PROFILE STATUS
        

        profileStatus: {
            type: String,
            enum: ['incomplete', 'complete'],
            default: 'incomplete'
        },

        

    
        
        // DRIVER STATUS & AVAILABILITY & Prefrences
        

        availability: {
            isAvailable: {
                type: Boolean,
                default: false
            },
            availabilityDays: [{
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }],
            availabilityStartTime: {
                type: String,  // Format: "09:00"
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
            },
            availabilityEndTime: {
                type: String,  // Format: "18:00"
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
            }
        },

        //preferred routes and service area

        preferredRoute: {
            area: {
                type: String,  // e.g., "DHA", "Bahria Town", "F-6"
                trim: true
            },
            coordinates: {
                type: {
                    type: String,
                    enum: ['Polygon'],
                    default: 'Polygon'
                },
                coordinates: {
                    type: [[[Number]]]  // Array of LinearRing coordinate arrays
                }
            },
            serviceRadiusKm: {
                type: Number,
                default: 5,
                min: 1,
                max: 50
            }
        },

        //current status

        canAcceptRides: { type: Boolean, default: false },

        currentLocation: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] }  // [longitude, latitude]
        },

        lastLocationUpdate: Date,

        //ride assignment status
        currentRideStatus: {
            type: String,
            enum: ['idle', 'assigned', 'picking_up', 'on_trip'],
            default: 'idle'
        },

        currentRideId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ride'
        },

        
        // STATISTICS
        

        totalRides: {
            type: Number,
            default: 0
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalRatings: {
            type: Number,
            default: 0
        },
        completeRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        acceptanceRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        sensitiveDataAccessLog: [{
            accessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            accessedAt: { type: Date, default: Date.now },
            accessType: { type: String, enum: ['view', 'update', 'approve', 'reject'] },
            ipAddress: String
        }]
    },
    

    
    {
        timestamps: true
    }
);


// INDEXES


DriverSchema.index({ currentLocation: '2dsphere' }, {sparse: true});
DriverSchema.index({ verificationStatus: 1 });
//DriverSchema.index({ user: 1 });
DriverSchema.index({ 'availability.isAvailable': 1 });
DriverSchema.index({ 'preferredRoute.area': 1 });
DriverSchema.index({ currentRideStatus: 1 });

//PRE- SAVE MIDDLEWARE: ENCRYPT CNIC
DriverSchema.pre('save', function() {
    if (this.isModified('cnic') && this.cnic) {
        this.cnicEncrypted = encrypt(this.cnic);
    }

});


//methods: security and access control

// Get masked CNIC (for driver's own view)
DriverSchema.methods.getMaskedCNIC = function() {
    if (this.cnic) {
        return maskCNIC(this.cnic);
    }
    return '****-****-****';
};
// Get decrypted CNIC (admin only)
DriverSchema.methods.getDecryptedCNIC = function() {
    if (this.cnicEncrypted) {
        return decrypt(this.cnicEncrypted);
    }
    return this.cnic;
};

// Get safe driver info for customers
DriverSchema.methods.getSafeDriverInfo = function() {
    return {
        driverId: this._id,
        vehicleType: this.vehicleType,
        vehicleInfo: this.vehicleInfo,
        rating: this.rating,
        totalRides: this.totalRides,
        isAvailable: this.availability?.isAvailable || false
    };
};
// Get driver info for driver themselves
DriverSchema.methods.getDriverOwnInfo = function() {
    return {
        driverId: this._id,
        cnic: this.getMaskedCNIC(),
        vehicleType: this.vehicleType,
        vehicleInfo: this.vehicleInfo,
        verificationStatus: this.verificationStatus,
        canAcceptRides: this.canAcceptRides,
        availability: this.availability,
        preferredRoute: this.preferredRoute,
        rating: this.rating,
        totalRides: this.totalRides,
        completionRate: this.completionRate
    };
};

//log sensitive data access
DriverSchema.methods.logSensitiveAccess = function(adminId, accessType, ipAddress) {
    this.sensitiveDataAccessLog.push({
        accessedBy: adminId,
        accessedAt: Date.now(),
        accessType,
        ipAddress
    });
};

// Check if driver is within service area
DriverSchema.methods.isWithinServiceArea = function(latitude, longitude) {
    if (!this.currentLocation || !this.currentLocation.coordinates) {
        return false;
    }

    const driverLat = this.currentLocation.coordinates[1];
    const driverLng = this.currentLocation.coordinates[0];

    // Calculate distance using Haversine
    const R = 6371; // Earth's radius in km
    const dLat = (latitude - driverLat) * Math.PI / 180;
    const dLon = (longitude - driverLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(driverLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= (this.preferredRoute?.serviceRadiusKm || 5);
};

// Check if driver is available for ride
DriverSchema.methods.canAcceptRideNow = function() {
    return (
        this.verificationStatus === 'approved' &&
        this.canAcceptRides === true &&
        this.availability?.isAvailable === true &&
        this.currentRideStatus === 'idle'
    );
};

// Check if time is within availability
DriverSchema.methods.isWithinAvailabilityTime = function() {
    if (!this.availability?.availabilityStartTime || !this.availability?.availabilityEndTime) {
        return true; // No time restriction
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= this.availability.availabilityStartTime && 
           currentTime <= this.availability.availabilityEndTime;
};
// Check if today is in availability days
DriverSchema.methods.isAvailableToday = function() {
    if (!this.availability?.availabilityDays || this.availability.availabilityDays.length === 0) {
        return true; // No day restriction
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    return this.availability.availabilityDays.includes(today);
};

// Add status to history
DriverSchema.methods.addStatusHistory = function(status, adminId, reason = null) {
    this.statusHistory.push({ status, changedAt: Date.now(), changedBy: adminId, reason });
};

// Approve driver
DriverSchema.methods.approve = function(adminId) {
    this.verificationStatus = 'approved';
    this.verifiedBy = adminId;
    this.verifiedAt = Date.now();
    this.rejectionReason = null;
    this.rejectedAt = null;
    this.canAcceptRides = true;
    this.addStatusHistory('approved', adminId);
};
// Reject driver
DriverSchema.methods.reject = function(adminId, reason) {
    this.verificationStatus = 'rejected';
    this.rejectionReason = reason;
    this.rejectedAt = Date.now();
    this.canAcceptRides = false;
    this.addStatusHistory('rejected', adminId, reason);
};


// METHODS


// Check if all documents are uploaded
DriverSchema.methods.areAllDocumentsUploaded = function() {
    const required = [
        'driverImage', 'cnicFront', 'cnicBack', 'drivingLicenseFront', 'drivingLicenseBack',
        'registrationDocument', 'vehicleFrontImage', 'vehicleBackImage', 'vehicleLeftImage', 'vehicleRightImage'
    ];
    const missing = [];
    
    required.forEach(field => {
        if (field.includes('vehicle') && field !== 'vehicleType') {
            if (!this.vehicleDocuments[field]) missing.push(field);
        } else if (!this.documents[field]) {
            missing.push(field);
        }
    });

    return { allUploaded: missing.length === 0, missingDocuments: missing };
};
module.exports = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);