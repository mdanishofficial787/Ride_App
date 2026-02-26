const mongoose = require('mongoose');

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
            trim: true
        },

        
        // PERSONAL DOCUMENTS
        

        documents: {
            // Driver Image
            driverImage: {
                type: String,
                required: [true, 'Please upload driver image']
            },

            // CNIC Documents
            cnicFront: {
                type: String,
                required: [true, 'Please upload CNIC front image']
            },

            cnicBack: {
                type: String,
                required: [true, 'Please upload CNIC back image']
            },

            // Driving License
            drivingLicenseFront: {
                type: String,
                required: [true, 'Please upload driving license front image']
            },

            drivingLicenseBack: {
                type: String,
                required: [true, 'Please upload driving license back image']
            }
        },

        
        // VEHICLE INFORMATION
        

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
            trim: true
        },

        vehicleRegistrationNumber: {
            type: String,
            required: [true, 'Please provide vehicle registration number'],
            unique: true,
            uppercase: true,
            trim: true
        },

        
        // VEHICLE DOCUMENTS
        

        vehicleDocuments: {
            // Vehicle Registration Document
            registrationDocument: {
                type: String,
                required: [true, 'Please upload vehicle registration document']
            },

            // Vehicle Images (4 angles)
            vehicleFrontImage: {
                type: String,
                required: [true, 'Please upload vehicle front image']
            },

            vehicleBackImage: {
                type: String,
                required: [true, 'Please upload vehicle back image']
            },

            vehicleLeftImage: {
                type: String,
                required: [true, 'Please upload vehicle left side image']
            },

            vehicleRightImage: {
                type: String,
                required: [true, 'Please upload vehicle right side image']
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

        

    
        
        // DRIVER STATUS & AVAILABILITY
        

        isAvailable: {
            type: Boolean,
            default: false
        },

        canAcceptRides: {
            type: Boolean,
            default: false
        },
        //location

        currentLocation: {
            type: {
                type: String,
                enum: ['Point'],
                //default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                //index: '2dsphere'
                default: undefined
            }
        },
        lastlocationUpdate:{
            type: Date
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
        }
    },
    {
        timestamps: true
    }
);


// INDEXES


DriverSchema.index({ currentLocation: '2dsphere' });
DriverSchema.index({ verificationStatus: 1 });



// METHODS


// Check if all documents are uploaded
DriverSchema.methods.areAllDocumentsUploaded = function () {
    const personalDocs = this.documents;
    const vehicleDocs = this.vehicleDocuments;

    const missingDocuments = [];

    // Check personal documents
    if (!personalDocs.driverImage) missingDocuments.push('driverImage');
    if (!personalDocs.cnicFront) missingDocuments.push('cnicFront');
    if (!personalDocs.cnicBack) missingDocuments.push('cnicBack');
    if (!personalDocs.drivingLicenseFront) missingDocuments.push('drivingLicenseFront');
    if (!personalDocs.drivingLicenseBack) missingDocuments.push('drivingLicenseBack');

    // Check vehicle documents
    if (!vehicleDocs.registrationDocument) missingDocuments.push('registrationDocument');
    if (!vehicleDocs.vehicleFrontImage) missingDocuments.push('vehicleFrontImage');
    if (!vehicleDocs.vehicleBackImage) missingDocuments.push('vehicleBackImage');
    if (!vehicleDocs.vehicleLeftImage) missingDocuments.push('vehicleLeftImage');
    if (!vehicleDocs.vehicleRightImage) missingDocuments.push('vehicleRightImage');

    return {
        allUploaded: missingDocuments.length === 0,
        missingDocuments: missingDocuments
    };
};

//update driver location

DriverSchema.methods.updateLocation = function (longitude, latitude) {
    this.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
    };

};

//adding status to history
DriverSchema.methods.addStatusHistory = function (status, adminId, reason = null) {
    this.statusHistory.push({
        status,
        changeAt: Date.now(),
        changeBy: adminId,
        reason
    });
};

//approving driver

DriverSchema.methods.approve = function (adminId) {
    this.verificationStatus = 'approved';
    this.verifiedBy = adminId;
    this.verifiedAt = Date.now();
    this.rejectionReason = null;
    this.rejectedAt = null;
    this.canAcceptRides = true;
    this.addStatusHistory('approved', adminId);
};

//rejecting driver
DriverSchema.methods.reject = function (adminId, reason) {
    this.verificationStatus = 'rejected';
    this.rejectionReason = reason;
    this.rejectedAt = Date.now();
    this.canAcceptRides = false;
    this.addStatusHistory('rejected', adminId, reason);
};

// checking if driver can accept rides
DriverSchema.methods.canAcceptRidesNow = function () {
    return this.verificationStatus === 'approved' && this.canAcceptRides;
};

module.exports = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);