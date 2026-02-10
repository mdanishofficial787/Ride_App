const Driver = require('../models/Driver');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

//creating driver profile
//route POST /api/drivers/profile

exports.createDriverProfile = async (req, res) => {
    try {
        const {
            cnic,
            vehicleType,
            vehicleLincenseNumber,
            vehicleReisgtrationNumber
        } = req.body;

        // check if user is a driver

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        if (user.userType !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Only users with driver role can create driver profiles'
            });
        }

        // check if profile already exists

        const existingProfile = await Driver.findOne({ user: req.user.id });

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Driver profile already exists. Please update instead. ',
                profileId: existingProfile._id,
                profileStatus: existingProfile.profileStatus
            });
        }

        // validate required fields

        const missingFields = {};

        if (!cnic) missingFields.cnic = true;
        if (!vehicleType) missingFields.vehicleType = true;
        if (!vehicleLincenseNumber) missingFields.vehicleLincenseNumber = true;
        if (!vehicleReisgtrationNumber) missingFields.vehicleReisgtrationNumber = true;
        if (!req.files || !req.files.driverImage) missingFields.driverImage = true;
        if (!req.files || req.files.vehicleImage) missingFields.vehicleImage = true;

        if (Object.keys(missingFields).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all requried fields',
                missingFields: missingFields
            });
        }
        // check duplicate cnic

        const existingCNIC = await Driver.findOne({ cnic});
        if (existingCNIC) {
            return res.status(400).json({
                success: false,
                message: 'This CNIC is already registered',
                field: 'cnic'
            });
        }
        // cehck duplicate license number

        const existingLincense = await Driver.findOne({ vehicleLincenseNumber });
        if (existingLincense) {
            return res.status(400).json({
                success: false,
                message: 'This vehicle license number is already registered.',
                field: 'vehicleLincenseNumber'
            });
        }

        //checking duplicate registration number

        const existingRegistration = await Driver.findOne({ vehicleRegistrationNumber });
        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'This vehicle registration number is already registered',
                field: 'vehicleRegistrationNumber'
            });
        }
        // validating vehicle type
        const valiVehicleTypes = ['car', 'bike','rickshaw', 'van'];
        if (!validVehicleTypes.includes(vehicleType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle type. Allowed types are car, bike, rickshaw, van.',
                field: 'vehicleType'
            });
        }
        // get upload images paths
        const driverImagePath = req.files.driverImage[0].path;
        const vehicleImagePath = req.files.vehicleImage[0].path;

        //create driver profile
        const driverProfile = await Driver.create({
            user: req.user.id,
            cnic,
            driverImage: driverImagePath,
            vehicleType,
            vehicleLincenseNumber: vehicleLincenseNumber.toUpperCase(),
            vehicleRegistrationNumber: vehicleReisgtrationNumber.toUpperCase(),
            vehicleImage: vehicleImagePath,
            profileStatus: 'pending'
        });

        // populate user data
        await driverProfile.populate('user', 'fullname email mobile');

        // send success response
        res.status(201).json({
            success: true,
            message: 'Driver profile created successfully! Your profile is pending verification. ',
            data: {
                profileId: driverProfile._id,
                user: {
                    userId: driverProfile.user._id,
                    fullname: driverProfile.user.fullname,
                    email: driverProfile.user.email,
                    mobile: driverProfile.user.mobile
                },
                personalInfo: {
                    cnic: driverProfile.cnic,
                    driverImage: driverProfile.driverImage
                },
                vehicleInfo: {
                    vehicleType: driverProfile.vehicleType,
                    vehicleLincenseNumber: driverProfile.vehicleLincenseNumber,
                    vehicleRegistrationNumber: driverProfile.vehicleRegistrationNumber,
                    vehicleImage: driverProfile.vehicleImage
                },
                profileStatus: driverProfile.profileStatus,

            }
        });
    } catch (error) {
        console.error('Crater driver profile error: ', error);

        //delete uploaded images if profile creation fails
        if (req.files) {
            if (req.files.driverImage) {
                fs.unlinkSync(req.files.driverImage[0].path);
            }
            if (req.files.vehicleImage) {
                fs.unlinkSync(req.files.vehicleImage[0].path);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Server error. Failed to create driver profile.',
            error: error.message
         });
    }

};

// get driver profile
// route GET /api/drivers/profile

exports.getDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id })
            .populate('user', 'fullname email mobile gender');

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create one.'
            });
        }

        res.status(200).json({
            success: true,
            data: driverProfile
        });
    } catch (error) {
        console.error('Get driver profile error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Failed to get driver profile.',
            error: error.message
        });
    }
};

//update driver profile
// route PUT /api/drivers/profile

exports.updateDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found. Please create one.'
            });
        }
        //don't allow updates if profile is approved
        if (driverProfile.profileStatus === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Approved profiles cannot be updated. Please contact support for any changes.'
            });
        }

        const {
            cnic,
            vehicleType,
            vehicleLincenseNumber,
            vehicleReisgtrationNumber
        } = req.body;

        // updat fields
        if (cnic) {
            const cnicRegex = /^[0-9]{13}$/;
            if (!cnicRegex.test(cnic)) {
                return res.status(400).json({
                    success: false,
                    message: 'CNIC must be exactly 13 digits.',
                    field: 'cnic'
                });
            }
            driverProfile.cnic = cnic;
        }
        if (vehicleType) {
            const validVehicleTypes = ['car', 'bike', 'rickshaw', 'van'];
            if (!validVehicleTypes.includes(vehicleType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vehicle type.',
                    field: 'vehicleType'
                });
            }
            driverProfile.vehicleType = vehicleType;
        }
        if (vehicleLincenseNumber) {
            driverProfile.vehicleLincenseNumber = vehicleLincenseNumber.toUpperCase();
        }
        if (vehicleLincenseNumber) {
            driverProfile.vehicleLincenseNumber = vehicleLincenseNumber.toUpperCase();
        }
        if (vehicleRegistrationNumber) {
            driverProfile.vehicleRegistrationNumber = vehicleRegistrationNumber.toUpperCase();
        }

        // UDPATE images if provided
        if (req.files && req.files.driverImage) {
            //delete old images
            if (fs.existsSync(driverProfile.driverImage)) {
                fs.unlinkSync(driverProfile.driverImage);
            }
            driverProfile.driverImage = req.files.driverImage[0].path;
        }

        if (req.files && req.files.vehicleImage) {
            //delete old image
            if (fs.existsSync(driverProfile.vehicleImage)) {
                fs.unlinkSync(driverProfile.vehicleImage);
            }
            driverProfile.vehicleImage = req.files.vehicleImage[0].path;
        }

        await driverProfile.save();

        res.status(200).json({
            success: true,
            message: 'Driver profile updated successfully!',
            data: driverProfile
        });
    } catch (error) {
        console.error('Update driver profile error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Failed to update driver profile.',
            error: error.message
        });
    }
};

//delete driver profile
// route DELETE /api/drivers/profile

exports.deleteDriverProfile = async (req, res) => {
    try {
        const driverProfile = await Driver.findOne({ user: req.user.id });

        if (!driverProfile) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found.'
            });
        }

        //delete images
        if (fs.existsSync(driverProfile.driverImage)) {
            fs.unlinkSync(driverProfile.driverImage);
        }
        if (fs.existsSync(driverProfile.vehicleImage)) {
            fs.unlinkSync(driverProfile.vehicleImage);
        }

        await Driver.findByIdAndDelete(driverProfile._id);

        res.status(200).json({
            success: true,
            message: 'Driver profile deleted successfully.'
        });
    } catch (error) {
        console.error('Delete driver profile error: ', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Failed to delete driver profile.',
            error: error.message
        });
    }
};