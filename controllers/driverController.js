const Driver = require('../models/Driver');
const User = require('../models/User');
const fs = require('fs');
const { deleteUploadedFiles } = require('../middleware/upload');


// Create Driver Profile with All Documents
// @route   POST /api/drivers/profile

exports.createDriverProfile = async (req, res) => {
    try {
        const {
            cnic,
            vehicleType,
            vehicleLicenseNumber,
            vehicleRegistrationNumber
        } = req.body;

        // 1. CHECK IF USER IS A DRIVER
       

        const user = await User.findById(req.user.id);

        if (!user) {
            deleteUploadedFiles(req.files);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.userType !== 'driver') {
            deleteUploadedFiles(req.files);
            return res.status(403).json({
                success: false,
                message: 'Only drivers can create driver profiles'
            });
        }

      
        // 2. CHECK IF PROFILE ALREADY EXISTS
    

        const existingProfile = await Driver.findOne({ user: req.user.id });

        if (existingProfile) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'Driver profile already exists. Please update instead.',
                profileId: existingProfile._id,
                profileStatus: existingProfile.profileStatus
            });
        }

    
        // 3. VALIDATE REQUIRED FIELDS
 

        const missingFields = {};

        // Text fields
        if (!cnic) missingFields.cnic = true;
        if (!vehicleType) missingFields.vehicleType = true;
        if (!vehicleLicenseNumber) missingFields.vehicleLicenseNumber = true;
        if (!vehicleRegistrationNumber) missingFields.vehicleRegistrationNumber = true;

        // Personal documents
        if (!req.files?.driverImage) missingFields.driverImage = true;
        if (!req.files?.cnicFront) missingFields.cnicFront = true;
        if (!req.files?.cnicBack) missingFields.cnicBack = true;
        if (!req.files?.drivingLicenseFront) missingFields.drivingLicenseFront = true;
        if (!req.files?.drivingLicenseBack) missingFields.drivingLicenseBack = true;

        // Vehicle documents
        if (!req.files?.registrationDocument) missingFields.registrationDocument = true;
        if (!req.files?.vehicleFrontImage) missingFields.vehicleFrontImage = true;
        if (!req.files?.vehicleBackImage) missingFields.vehicleBackImage = true;
        if (!req.files?.vehicleLeftImage) missingFields.vehicleLeftImage = true;
        if (!req.files?.vehicleRightImage) missingFields.vehicleRightImage = true;

        if (Object.keys(missingFields).length > 0) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields and documents',
                missingFields: missingFields,
                requiredDocuments: {
                    personal: ['driverImage', 'cnicFront', 'cnicBack', 'drivingLicenseFront', 'drivingLicenseBack'],
                    vehicle: ['registrationDocument', 'vehicleFrontImage', 'vehicleBackImage', 'vehicleLeftImage', 'vehicleRightImage']
                }
            });
        }

        
        // 4. VALIDATE CNIC FORMAT
       

        const cnicRegex = /^[0-9]{13}$/;
        if (!cnicRegex.test(cnic)) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'CNIC must be exactly 13 digits',
                field: 'cnic'
            });
        }

       
        // CHECK DUPLICATES
       

        const existingCNIC = await Driver.findOne({ cnic });
        if (existingCNIC) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'This CNIC is already registered',
                field: 'cnic'
            });
        }

        const existingLicense = await Driver.findOne({ vehicleLicenseNumber: vehicleLicenseNumber.toUpperCase() });
        if (existingLicense) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'This vehicle license number is already registered',
                field: 'vehicleLicenseNumber'
            });
        }

        const existingRegistration = await Driver.findOne({ vehicleRegistrationNumber: vehicleRegistrationNumber.toUpperCase() });
        if (existingRegistration) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'This vehicle registration number is already registered',
                field: 'vehicleRegistrationNumber'
            });
        }

       
        //  VALIDATE VEHICLE TYPE
        

        const validVehicleTypes = ['car', 'bike', 'rickshaw', 'van'];
        if (!validVehicleTypes.includes(vehicleType)) {
            deleteUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle type. Choose from: car, bike, rickshaw, van',
                field: 'vehicleType'
            });
        }

        
        // 7. CREATE DRIVER PROFILE
        

        const driverProfile = await Driver.create({
            user: req.user.id,
            cnic,
            documents: {
                driverImage: req.files.driverImage[0].path,
                cnicFront: req.files.cnicFront[0].path,
                cnicBack: req.files.cnicBack[0].path,
                drivingLicenseFront: req.files.drivingLicenseFront[0].path,
                drivingLicenseBack: req.files.drivingLicenseBack[0].path
            },
            vehicleType,
            vehicleLicenseNumber: vehicleLicenseNumber.toUpperCase(),
            vehicleRegistrationNumber: vehicleRegistrationNumber.toUpperCase(),
            vehicleDocuments: {
                registrationDocument: req.files.registrationDocument[0].path,
                vehicleFrontImage: req.files.vehicleFrontImage[0].path,
                vehicleBackImage: req.files.vehicleBackImage[0].path,
                vehicleLeftImage: req.files.vehicleLeftImage[0].path,
                vehicleRightImage: req.files.vehicleRightImage[0].path
            },
            profileStatus: 'pending',// All documents uploaded, now pending verification
            verificationStatus: 'pending',
            canAcceptRides: false
        });

        //initial status to history
        driverProfile.addStatusHistory('pending', req.user.id);
        await driverProfile.save();

        await driverProfile.populate('user', 'fullname email mobile');

        res.status(200).json({
            success: true,
            message: 'Driver profile created successfully!',
            data: {
                profileId: driverProfile._id,
                user: {
                    userId: driverProfile.user._id,
                    fullname: driverProfile.user.fullname,
                    email: driverProfile.user.email,
                    mobile: driverProfile.user.mobile
                },
                personalInfo: {
                    cnic: driverProfile.cnic
                },
                personalDocuments: {
                    driverImage: driverProfile.documents.driverImage,
                    cnicFront: driverProfile.documents.cnicFront,
                    cnicBack: driverProfile.documents.cnicBack,
                    drivingLicenseFront: driverProfile.documents.drivingLicenseFront,
                    drivingLicenseBack: driverProfile.documents.drivingLicenseBack
                },
                vehicleInfo: {
                    vehicleType: driverProfile.vehicleType,
                    vehicleLicenseNumber: driverProfile.vehicleLicenseNumber,
                    vehicleRegistrationNumber: driverProfile.vehicleRegistrationNumber
                },
                vehicleDocuments: {
                    registrationDocument: driverProfile.vehicleDocuments.registrationDocument,
                    vehicleFrontImage: driverProfile.vehicleDocuments.vehicleFrontImage,
                    vehicleBackImage: driverProfile.vehicleDocuments.vehicleBackImage,
                    vehicleLeftImage: driverProfile.vehicleDocuments.vehicleLeftImage,
                    vehicleRightImage: driverProfile.vehicleDocuments.vehicleRightImage
                },
                verificationStatus: {
                    status: driverProfile.verificationStatus,
                    canAcceptRides: driverProfile.canAcceptRides,
                    message: 'Your profile is pending admin verification. You will be notified once verified.'
                },
                profileStatus: driverProfile.profileStatus,
                createdAt: driverProfile.createdAt,
                documentSummary: {
                    TotalDocumentsRequired: 10,
                    totalDocumentsUploaded: 10,
                    allDocumentsUploaded: true
                }
            }
        });

    } catch (error) {
        console.error('Create driver profile error:', error);
        deleteUploadedFiles(req.files);

        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

//   Get Driver Profile
// @route   GET /api/drivers/profile


exports.getDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .populate('user', 'fullname email mobile gender')
            .populate('verifiedBy', 'fullname email');

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create your profile first.'
            });
        }

        // Check document upload status
        const documentStatus = driverProfile.areAllDocumentsUploaded();

        res.status(200).json({
            success: true,
            data: {
                ...driverProfile.toObject(),
                documentUploadStatus: documentStatus,
                verificationInfo: {
                    status: driverProfile.verificationStatus,
                    canAcceptRides: driverProfile.canAcceptRides,
                    verifiedAt: driverProfile.verifiedAt,
                    verifiedBy: driverProfile.verifiedBy ? {
                        name: driverProfile.verifiedBy.fullname,
                        email: driverProfile.verifiedBy.email
                    }: null,
                    rejectedAt: driverProfile.rejectedAt,
                    rejectionReason: driverProfile.rejectionReason,
                    statusMessage: getStatusMessage(driverProfile.verificationStatus)
                }
            }
        });

    } catch (error) {
        console.error('Get driver profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

//get verification Status
// route GET /api/drivers/verification-status

exports.getVerificationStatus = async (req, res) => {
    try{
        const driverProfile = await Driver.findOne({ user: req.user.id })
        .select('verificationStatus canAcceptRides rejectionReason rejectedAt verifiedAt verifiedBy statusHistory')
        .populate('verifiedBy', 'fullname email');

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create your profile first.'
            });
        }
        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driverProfile.verificationStatus,
                canAcceptRides: driverProfile.canAcceptRides,
                statusMessage: getStatusMessage(driverProfile.verificationStatus),
                verifiedAt: driverProfile.verifiedAt,
                verifiedBy: driverProfile.verifiedBy ? {
                    name: driverProfile.verifiedBy.fullname,
                    email: driverProfile.verifiedBy.email
                }: null,
                rejectedAt: driverProfile.rejectedAt,
                rejectionReason: driverProfile.rejectionReason,
                addStatusHistory: driverProfile.statusHistory,
                nextSteps: getNextSteps(driverProfile.verificationStatus)
            }
        });
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again',
            error: error.message
        });
    }
};


// Check Document Upload Status
// @route   GET /api/drivers/profile/document-status


exports.getDocumentStatus = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const documentStatus = driverProfile.areAllDocumentsUploaded();

        res.status(200).json({
            success: true,
            data: {
                profileStatus: driverProfile.profileStatus,
                allDocumentsUploaded: documentStatus.allUploaded,
                missingDocuments: documentStatus.missingDocuments,
                uploadedDocuments: {
                    personal: {
                        driverImage: !!driverProfile.documents.driverImage,
                        cnicFront: !!driverProfile.documents.cnicFront,
                        cnicBack: !!driverProfile.documents.cnicBack,
                        drivingLicenseFront: !!driverProfile.documents.drivingLicenseFront,
                        drivingLicenseBack: !!driverProfile.documents.drivingLicenseBack
                    },
                    vehicle: {
                        registrationDocument: !!driverProfile.vehicleDocuments.registrationDocument,
                        vehicleFrontImage: !!driverProfile.vehicleDocuments.vehicleFrontImage,
                        vehicleBackImage: !!driverProfile.vehicleDocuments.vehicleBackImage,
                        vehicleLeftImage: !!driverProfile.vehicleDocuments.vehicleLeftImage,
                        vehicleRightImage: !!driverProfile.vehicleDocuments.vehicleRightImage
                    }
                },
                summary: {
                    totalRequired: 10,
                    totalUploaded: 10 - documentStatus.missingDocuments.length,
                    percentageComplete: Math.round(((10 - documentStatus.missingDocuments.length) / 10) * 100)
                }
            }
        });

    } catch (error) {
        console.error('Get document status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


// @desc    Delete Driver Profile
// @route   DELETE /api/drivers/profile

exports.deleteDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        // Delete all uploaded documents
        const documentsToDelete = [
            driverProfile.documents.driverImage,
            driverProfile.documents.cnicFront,
            driverProfile.documents.cnicBack,
            driverProfile.documents.drivingLicenseFront,
            driverProfile.documents.drivingLicenseBack,
            driverProfile.vehicleDocuments.registrationDocument,
            driverProfile.vehicleDocuments.vehicleFrontImage,
            driverProfile.vehicleDocuments.vehicleBackImage,
            driverProfile.vehicleDocuments.vehicleLeftImage,
            driverProfile.vehicleDocuments.vehicleRightImage
        ];

        documentsToDelete.forEach(filePath => {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        await Driver.findByIdAndDelete(driverProfile._id);

        res.status(200).json({
            success: true,
            message: 'Driver profile and all documents deleted successfully'
        });

    } catch (error) {
        console.error('Delete driver profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

// update Driver Location
// PUT /api/drivers/location
exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        // Validate input
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both latitude and longitude',
                missingFields: {
                    latitude: !latitude,
                    longitude: !longitude
                }
            });
        }

        // Validate latitude
        const lat = parseFloat(latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            return res.status(400).json({
                success: false,
                message: 'Latitude must be a valid number between -90 and 90',
                field: 'latitude',
                receivedValue: latitude,
                validRange: { min: -90, max: 90 }
            });
        }

        // Validate longitude
        const lng = parseFloat(longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: 'Longitude must be a valid number between -180 and 180',
                field: 'longitude',
                receivedValue: longitude,
                validRange: { min: -180, max: 180 }
            });
        }

        // Get driver profile from middleware (already verified as approved)
        const driverProfile = req.driverProfile;

        // Update location
        driverProfile.currentLocation = {
            type: 'Point',
            coordinates: [lng, lat]
        };
        driverProfile.lastLocationUpdate = Date.now();

        await driverProfile.save();

        res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            data: {
                location: {
                    latitude: lat,
                    longitude: lng,
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                updatedAt: driverProfile.lastLocationUpdate,
                isAvailable: driverProfile.isAvailable,
                canAcceptRides: driverProfile.canAcceptRides,
                verificationStatus: driverProfile.verificationStatus
            }
        });

    } catch (error) {
        console.error('Update driver location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

//     Get Current Location
// @route   GET /api/drivers/location

exports.getCurrentLocation = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .select('currentLocation lastLocationUpdate isAvailable canAcceptRides verificationStatus');

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        // Check if location exists
        if (!driverProfile.currentLocation || !driverProfile.currentLocation.coordinates) {
            return res.status(200).json({
                success: true,
                message: 'No location data available',
                data: {
                    hasLocation: false,
                    location: null,
                    lastUpdate: null,
                    verificationStatus: driverProfile.verificationStatus,
                    canUpdateLocation: driverProfile.verificationStatus === 'approved'
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                hasLocation: true,
                location: {
                    latitude: driverProfile.currentLocation.coordinates[1],
                    longitude: driverProfile.currentLocation.coordinates[0],
                    coordinates: driverProfile.currentLocation.coordinates,
                    type: driverProfile.currentLocation.type
                },
                lastUpdate: driverProfile.lastLocationUpdate,
                isAvailable: driverProfile.isAvailable,
                canAcceptRides: driverProfile.canAcceptRides,
                verificationStatus: driverProfile.verificationStatus
            }
        });

    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


//   Toggle Driver Availability
// @route   PUT /api/drivers/availability

exports.toggleAvailability = async (req, res) => {
    try {
        const { isAvailable } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Please provide isAvailable as true or false',
                field: 'isAvailable'
            });
        }

        // Get driver profile from middleware (already verified as approved)
        const driverProfile = req.driverProfile;

        // Check if location is set before going online
        if (isAvailable && !driverProfile.currentLocation?.coordinates) {
            return res.status(400).json({
                success: false,
                message: 'Please update your location before going online',
                requiresLocation: true
            });
        }

        driverProfile.isAvailable = isAvailable;
        await driverProfile.save();

        res.status(200).json({
            success: true,
            message: `You are now ${isAvailable ? 'online' : 'offline'}`,
            data: {
                isAvailable: driverProfile.isAvailable,
                canAcceptRides: driverProfile.canAcceptRides && isAvailable,
                currentLocation: driverProfile.currentLocation
            }
        });

    } catch (error) {
        console.error('Toggle availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};

//   Find Nearby Drivers (for ride matching)
// @route   POST /api/drivers/nearby

exports.findNearbyDrivers = async (req, res) => {
    try {
        const { latitude, longitude, maxDistance = 5000, vehicleType } = req.body;

        // Validate input
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Please provide latitude and longitude',
                missingFields: {
                    latitude: !latitude,
                    longitude: !longitude
                }
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        // Validate coordinates
        if (isNaN(lat) || lat < -90 || lat > 90) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude',
                field: 'latitude'
            });
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid longitude',
                field: 'longitude'
            });
        }

        // Build query
        const query = {
            verificationStatus: 'approved',
            isAvailable: true,
            canAcceptRides: true,
            currentLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: parseInt(maxDistance) // meters
                }
            }
        };

        // Filter by vehicle type if provided
        if (vehicleType) {
            query.vehicleType = vehicleType;
        }

        // Find nearby drivers
        const nearbyDrivers = await Driver.find(query)
            .populate('user', 'fullname mobile')
            .select('user vehicleType vehicleLicenseNumber currentLocation rating totalRides isAvailable')
            .limit(20);

        // Calculate distances and format response
        const driversWithDistance = nearbyDrivers.map(driver => {
            const driverLng = driver.currentLocation.coordinates[0];
            const driverLat = driver.currentLocation.coordinates[1];
            
            // Calculate distance using Haversine formula
            const distance = calculateDistance(lat, lng, driverLat, driverLng);

            return {
                driverId: driver._id,
                driver: {
                    name: driver.user.fullname,
                    mobile: driver.user.mobile
                },
                vehicleType: driver.vehicleType,
                vehicleLicenseNumber: driver.vehicleLicenseNumber,
                location: {
                    latitude: driverLat,
                    longitude: driverLng
                },
                distance: {
                    meters: Math.round(distance),
                    kilometers: (distance / 1000).toFixed(2)
                },
                rating: driver.rating,
                totalRides: driver.totalRides,
                isAvailable: driver.isAvailable
            };
        });

        // Sort by distance
        driversWithDistance.sort((a, b) => a.distance.meters - b.distance.meters);

        res.status(200).json({
            success: true,
            count: driversWithDistance.length,
            searchLocation: {
                latitude: lat,
                longitude: lng
            },
            maxDistance: {
                meters: maxDistance,
                kilometers: (maxDistance / 1000).toFixed(2)
            },
            data: driversWithDistance
        });

    } catch (error) {
        console.error('Find nearby drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: error.message
        });
    }
};


// HELPER FUNCTIONs: Calculate Distance (Haversine)

function getStatusMessage(status) {
    const messages = {
        pending: 'Your profile is under review. You will be notified once verified.',
        approved: 'Your profile has been approved! You can now accept rides.',
        rejected: 'Your profile has been rejected. Please check the rejection reason and resubmit.'
    };
    return messages[status] || 'Unknown status';
}

function getNextSteps(status) {
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
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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
}