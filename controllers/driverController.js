const Driver = require('../models/Driver');
const User = require('../models/user');
const { uploadMultipleToCloudinary } = require('../utils/cloudinaryUpload');
const { validateCNIC, validateVehicleType, validateCoordinates } = require('../utils/validators');
const { errorResponse, successResponse, getStatusMessage, getNextSteps, calculateDistance } = require('../utils/helpers');


//     Create Driver Profile
// @route   POST /api/drivers/profile

exports.createDriverProfile = async (req, res) => {
    try {
        const { cnic, vehicleType, vehicleLicenseNumber, vehicleRegistrationNumber } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json(errorResponse('User not found'));
        }

        if (user.userType !== 'driver') {
            return res.status(403).json(errorResponse('Only drivers can create driver profiles'));
        }

        const existingProfile = await Driver.findOne({ user: req.user.id });

        if (existingProfile) {
            return res.status(400).json(errorResponse('Driver profile already exists. Please update instead.', null, {
                profileId: existingProfile._id,
                profileStatus: existingProfile.profileStatus
            }));
        }

        // Validate fields
        const missingFields = {};
        if (!cnic) missingFields.cnic = true;
        if (!vehicleType) missingFields.vehicleType = true;
        if (!vehicleLicenseNumber) missingFields.vehicleLicenseNumber = true;
        if (!vehicleRegistrationNumber) missingFields.vehicleRegistrationNumber = true;

        const requiredFiles = ['driverImage', 'cnicFront', 'cnicBack', 'drivingLicenseFront', 'drivingLicenseBack',
                               'registrationDocument', 'vehicleFrontImage', 'vehicleBackImage', 'vehicleLeftImage', 'vehicleRightImage'];
        
        requiredFiles.forEach(field => {
            if (!req.files?.[field]) missingFields[field] = true;
        });

        if (Object.keys(missingFields).length > 0) {
            return res.status(400).json(errorResponse('Please provide all required fields and documents', null, { missingFields }));
        }

        if (!validateCNIC(cnic)) {
            return res.status(400).json(errorResponse('CNIC must be exactly 13 digits', 'cnic'));
        }

        // Check duplicates
        const existingCNIC = await Driver.findOne({ cnic });
        if (existingCNIC) {
            return res.status(400).json(errorResponse('This CNIC is already registered', 'cnic'));
        }

        const existingLicense = await Driver.findOne({ vehicleLicenseNumber: vehicleLicenseNumber.toUpperCase() });
        if (existingLicense) {
            return res.status(400).json(errorResponse('This vehicle license number is already registered', 'vehicleLicenseNumber'));
        }

        const existingRegistration = await Driver.findOne({ vehicleRegistrationNumber: vehicleRegistrationNumber.toUpperCase() });
        if (existingRegistration) {
            return res.status(400).json(errorResponse('This vehicle registration number is already registered', 'vehicleRegistrationNumber'));
        }

        if (!validateVehicleType(vehicleType)) {
            return res.status(400).json(errorResponse('Invalid vehicle type. Choose from: car, bike, rickshaw, van', 'vehicleType'));
        }

        // Upload to Cloudinary
        console.log('📤 Uploading images to Cloudinary...');
        let uploadedUrls;
        try {
            uploadedUrls = await uploadMultipleToCloudinary(req.files);
            console.log(' All images uploaded to Cloudinary');
        } catch (error) {
            console.error(' Cloudinary upload error:', error);
            return res.status(500).json(errorResponse('Failed to upload images. Please try again.', null, { error: error.message }));
        }

        // Create profile
        const driverProfile = await Driver.create({
            user: req.user.id,
            cnic,
            documents: {
                driverImage: uploadedUrls.driverImage,
                cnicFront: uploadedUrls.cnicFront,
                cnicBack: uploadedUrls.cnicBack,
                drivingLicenseFront: uploadedUrls.drivingLicenseFront,
                drivingLicenseBack: uploadedUrls.drivingLicenseBack
            },
            vehicleType,
            vehicleLicenseNumber: vehicleLicenseNumber.toUpperCase(),
            vehicleRegistrationNumber: vehicleRegistrationNumber.toUpperCase(),
            vehicleDocuments: {
                registrationDocument: uploadedUrls.registrationDocument,
                vehicleFrontImage: uploadedUrls.vehicleFrontImage,
                vehicleBackImage: uploadedUrls.vehicleBackImage,
                vehicleLeftImage: uploadedUrls.vehicleLeftImage,
                vehicleRightImage: uploadedUrls.vehicleRightImage
            },
            profileStatus: 'complete',
            verificationStatus: 'pending',
            canAcceptRides: false
        });

        driverProfile.addStatusHistory('pending', req.user.id);
        await driverProfile.save();
        await driverProfile.populate('user', 'fullname email mobile');

        res.status(201).json(successResponse('Driver profile created successfully! All documents uploaded to cloud. Your profile is pending admin verification.', {
            profileId: driverProfile._id,
            user: {
                userId: driverProfile.user._id,
                fullname: driverProfile.user.fullname,
                email: driverProfile.user.email,
                mobile: driverProfile.user.mobile
            },
            personalInfo: { cnic: driverProfile.cnic },
            personalDocuments: driverProfile.documents,
            vehicleInfo: {
                vehicleType: driverProfile.vehicleType,
                vehicleLicenseNumber: driverProfile.vehicleLicenseNumber,
                vehicleRegistrationNumber: driverProfile.vehicleRegistrationNumber
            },
            vehicleDocuments: driverProfile.vehicleDocuments,
            verificationStatus: {
                status: driverProfile.verificationStatus,
                canAcceptRides: driverProfile.canAcceptRides,
                message: 'Your profile is under review. You will be notified once verified.'
            },
            profileStatus: driverProfile.profileStatus,
            createdAt: driverProfile.createdAt,
            documentSummary: {
                totalDocumentsRequired: 10,
                totalDocumentsUploaded: 10,
                allDocumentsUploaded: true,
                storedOn: 'Cloudinary'
            }
        }));

    } catch (error) {
        console.error('Create driver profile error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//   Get Driver Profile
// route   GET /api/drivers/profile

exports.getDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .populate('user', 'fullname email mobile gender')
            .populate('verifiedBy', 'fullname email');

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found. Please create your profile first.'));
        }

        const documentStatus = driverProfile.areAllDocumentsUploaded();

        res.status(200).json(successResponse('Driver profile retrieved successfully', {
            ...driverProfile.toObject(),
            documentUploadStatus: documentStatus,
            verificationInfo: {
                status: driverProfile.verificationStatus,
                canAcceptRides: driverProfile.canAcceptRides,
                verifiedAt: driverProfile.verifiedAt,
                verifiedBy: driverProfile.verifiedBy ? {
                    name: driverProfile.verifiedBy.fullname,
                    email: driverProfile.verifiedBy.email
                } : null,
                rejectedAt: driverProfile.rejectedAt,
                rejectionReason: driverProfile.rejectionReason,
                statusMessage: getStatusMessage(driverProfile.verificationStatus)
            }
        }));

    } catch (error) {
        console.error('Get driver profile error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//     Get Verification Status
// route   GET /api/drivers/verification-status

exports.getVerificationStatus = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .select('verificationStatus rejectionReason canAcceptRides verifiedAt rejectedAt statusHistory')
            .populate('verifiedBy', 'fullname email');

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found. Please create your profile first.'));
        }

        res.status(200).json(successResponse('Verification status retrieved', {
            verificationStatus: driverProfile.verificationStatus,
            canAcceptRides: driverProfile.canAcceptRides,
            statusMessage: getStatusMessage(driverProfile.verificationStatus),
            verifiedAt: driverProfile.verifiedAt,
            verifiedBy: driverProfile.verifiedBy ? {
                name: driverProfile.verifiedBy.fullname,
                email: driverProfile.verifiedBy.email
            } : null,
            rejectedAt: driverProfile.rejectedAt,
            rejectionReason: driverProfile.rejectionReason,
            statusHistory: driverProfile.statusHistory,
            nextSteps: getNextSteps(driverProfile.verificationStatus)
        }));

    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//    Update Driver Location
// route   PUT /api/drivers/location

exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json(errorResponse('Please provide both latitude and longitude', null, {
                missingFields: { latitude: latitude === undefined, longitude: longitude === undefined }
            }));
        }

        const validation = validateCoordinates(latitude, longitude);
        if (!validation.valid) {
            return res.status(400).json(errorResponse(validation.message));
        }

        const driverProfile = await Driver.findOne({ user: req.user.id }).populate('user', 'fullname email mobile');

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found. Please create your profile first.', null, { requiresProfileCreation: true }));
        }

        if (driverProfile.verificationStatus === 'pending') {
            return res.status(403).json(errorResponse('Location updates not allowed. Your profile is still pending verification.', null, {
                verificationStatus: 'pending',
                reason: 'Only approved drivers can update their location',
                nextSteps: getNextSteps('pending')
            }));
        }

        if (driverProfile.verificationStatus === 'rejected') {
            return res.status(403).json(errorResponse('Location updates not allowed. Your profile has been rejected.', null, {
                verificationStatus: 'rejected',
                rejectionReason: driverProfile.rejectionReason,
                reason: 'Only approved drivers can update their location',
                nextSteps: getNextSteps('rejected')
            }));
        }

        if (driverProfile.verificationStatus !== 'approved') {
            return res.status(403).json(errorResponse('Location updates not allowed. Invalid verification status.', null, {
                verificationStatus: driverProfile.verificationStatus,
                reason: 'Only approved drivers can update their location'
            }));
        }

        const previousLocation = driverProfile.currentLocation?.coordinates 
            ? { latitude: driverProfile.currentLocation.coordinates[1], longitude: driverProfile.currentLocation.coordinates[0] }
            : null;

        driverProfile.currentLocation = {
            type: 'Point',
            coordinates: [validation.lng, validation.lat]
        };
        driverProfile.lastLocationUpdate = Date.now();
        await driverProfile.save();

        res.status(200).json(successResponse('Location updated successfully', {
            driverId: driverProfile._id,
            driver: {
                name: driverProfile.user.fullname,
                email: driverProfile.user.email
            },
            location: {
                latitude: validation.lat,
                longitude: validation.lng,
                coordinates: [validation.lng, validation.lat],
                type: 'Point'
            },
            previousLocation,
            updatedAt: driverProfile.lastLocationUpdate,
            isAvailable: driverProfile.isAvailable,
            canAcceptRides: driverProfile.canAcceptRides
        }));

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//    Get Current Location
// route   GET /api/drivers/location

exports.getCurrentLocation = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .select('currentLocation lastLocationUpdate isAvailable canAcceptRides verificationStatus');

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found'));
        }

        if (!driverProfile.currentLocation || !driverProfile.currentLocation.coordinates) {
            return res.status(200).json(successResponse('No location data available', {
                hasLocation: false,
                location: null,
                lastUpdate: null,
                verificationStatus: driverProfile.verificationStatus,
                canUpdateLocation: driverProfile.verificationStatus === 'approved'
            }));
        }

        res.status(200).json(successResponse('Location retrieved successfully', {
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
        }));

    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//  Toggle Driver Availability
// route   PUT /api/drivers/availability

exports.toggleAvailability = async (req, res) => {
    try {
        const { isAvailable } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json(errorResponse('Please provide isAvailable as a boolean value (true or false)', 'isAvailable'));
        }

        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found'));
        }

        if (driverProfile.verificationStatus !== 'approved') {
            return res.status(403).json(errorResponse('Cannot change availability. Only approved drivers can go online.', null, {
                verificationStatus: driverProfile.verificationStatus
            }));
        }

        if (isAvailable && (!driverProfile.currentLocation || !driverProfile.currentLocation.coordinates)) {
            return res.status(400).json(errorResponse('Cannot go online without location. Please update your location first.', null, {
                requiresLocation: true
            }));
        }

        driverProfile.isAvailable = isAvailable;
        await driverProfile.save();

        res.status(200).json(successResponse(`Driver is now ${isAvailable ? 'online' : 'offline'}`, {
            driverId: driverProfile._id,
            isAvailable: driverProfile.isAvailable,
            canAcceptRides: driverProfile.canAcceptRides,
            hasLocation: !!driverProfile.currentLocation?.coordinates
        }));

    } catch (error) {
        console.error('Toggle availability error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//    Find Nearby Drivers
// route   POST /api/drivers/nearby

exports.findNearbyDrivers = async (req, res) => {
    try {
        const { latitude, longitude, maxDistance = 5000, vehicleType } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json(errorResponse('Please provide latitude and longitude', null, {
                missingFields: { latitude: !latitude, longitude: !longitude }
            }));
        }

        const validation = validateCoordinates(latitude, longitude);
        if (!validation.valid) {
            return res.status(400).json(errorResponse(validation.message));
        }

        const query = {
            verificationStatus: 'approved',
            isAvailable: true,
            canAcceptRides: true,
            currentLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [validation.lng, validation.lat]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        };

        if (vehicleType && validateVehicleType(vehicleType)) {
            query.vehicleType = vehicleType;
        }

        const nearbyDrivers = await Driver.find(query)
            .populate('user', 'fullname mobile')
            .select('user vehicleType vehicleLicenseNumber currentLocation rating totalRides isAvailable')
            .limit(20);

        const driversWithDistance = nearbyDrivers.map(driver => {
            const driverLng = driver.currentLocation.coordinates[0];
            const driverLat = driver.currentLocation.coordinates[1];
            const distance = calculateDistance(validation.lat, validation.lng, driverLat, driverLng);

            return {
                driverId: driver._id,
                driver: {
                    name: driver.user.fullname,
                    mobile: driver.user.mobile
                },
                vehicleType: driver.vehicleType,
                vehicleLicenseNumber: driver.vehicleLicenseNumber,
                location: { latitude: driverLat, longitude: driverLng },
                distance: {
                    meters: Math.round(distance),
                    kilometers: (distance / 1000).toFixed(2)
                },
                rating: driver.rating,
                totalRides: driver.totalRides,
                isAvailable: driver.isAvailable
            };
        });

        driversWithDistance.sort((a, b) => a.distance.meters - b.distance.meters);

        res.status(200).json(successResponse(`Found ${driversWithDistance.length} nearby drivers`, {
            count: driversWithDistance.length,
            searchLocation: { latitude: validation.lat, longitude: validation.lng },
            maxDistance: { meters: maxDistance, kilometers: (maxDistance / 1000).toFixed(2) },
            drivers: driversWithDistance
        }));

    } catch (error) {
        console.error('Find nearby drivers error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};


//  Delete Driver Profile
// route   DELETE /api/drivers/profile

exports.deleteDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json(errorResponse('Driver profile not found'));
        }

        // Note: In production, you should also delete from Cloudinary
        await Driver.findByIdAndDelete(driverProfile._id);

        res.status(200).json(successResponse('Driver profile deleted successfully'));

    } catch (error) {
        console.error('Delete driver profile error:', error);
        res.status(500).json(errorResponse('Server error. Please try again.', null, { error: error.message }));
    }
};