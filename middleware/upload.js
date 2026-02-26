const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

//configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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
const uploadDirs = [
    './uploads/drivers/personal',
    './uploads/drivers/vehicle'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage for personal documents
const personalStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/drivers/personal');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Configure storage for vehicle documents
const vehicleStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/drivers/vehicle');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});


// Configure multer for all driver documents
const upload = multer({
    storage: personalStorage, // Default storage
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// ============================================
// MIDDLEWARE: Upload All Driver Documents
// ============================================
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

// ============================================
// MIDDLEWARE: Upload Personal Documents Only
// ============================================
exports.uploadPersonalDocuments = upload.fields([
    { name: 'driverImage', maxCount: 1 },
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack', maxCount: 1 }
]);

// ============================================
// MIDDLEWARE: Upload Vehicle Documents Only
// ============================================
exports.uploadVehicleDocuments = upload.fields([
    { name: 'registrationDocument', maxCount: 1 },
    { name: 'vehicleFrontImage', maxCount: 1 },
    { name: 'vehicleBackImage', maxCount: 1 },
    { name: 'vehicleLeftImage', maxCount: 1 },
    { name: 'vehicleRightImage', maxCount: 1 }
]);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
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

// ============================================
// HELPER: Delete uploaded files
// ============================================
exports.deleteUploadedFiles = (files) => {
    if (!files) return;
    
    Object.keys(files).forEach(fieldname => {
        files[fieldname].forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
    });
};