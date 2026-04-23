const multer = require('multer');
const path = require('path');

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only .jpg, .jpeg, and .png files are allowed!'));
};

// Multer with memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter
});

// Define all driver document fields
const uploadFields = upload.fields([
    { name: 'driverImage', maxCount: 1 },
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack', maxCount: 1 },
    { name: 'registrationDocument', maxCount: 1 },
    { name: 'vehicleFrontImage', maxCount: 1 },
    { name: 'vehicleBackImage', maxCount: 1 },
    { name: 'vehicleLeftImage', maxCount: 1 },
    { name: 'vehicleRightImage', maxCount: 1 }
]);

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
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
                message: `Unexpected file field: ${err.field}`,
                field: err.field
            });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
};

module.exports = { uploadFields, handleUploadError };