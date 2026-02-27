const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
// const cloudinary = require('cloudinary').v2;
// const fs = require('fs');

//file filter -only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only .jpg, .jpeg, and .png files are allowed!'));
};

// Create uploads directory structure




// Configure multer for all driver documents
const upload = multer({
    storage: storage, // Default storage
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});


// MIDDLEWARE: Upload All Driver Documents

exports.uploadAllDriverDocuments = upload.fields([
    // Personal Documents (5 files)
    { name: 'driverImage', maxCount: 1 },
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack', maxCount: 1 },
    
    // Vehicle Documents (5 files)
    { name: 'registrationDocument', maxCount: 1 },
    { name: 'vehicleFrontImage', maxCount: 1 },
    { name: 'vehicleBackImage', maxCount: 1 },
    { name: 'vehicleLeftImage', maxCount: 1 },
    { name: 'vehicleRightImage', maxCount: 1 }
]);




// ERROR HANDLING MIDDLEWARE

exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB per file.',
                field: err.field
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: `Unexpected file uploaded: ${err.field}`,
                field: err.field
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message,
            field: err.field
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

