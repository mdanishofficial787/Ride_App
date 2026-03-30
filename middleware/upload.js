const multer = require('multer');
const path = require('path');

//const storage = multer.memoryStorage();
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
//const fs = require('fs');


//config cloudinary

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//log configuration status (oonly in development)
if (process.env.NODE_ENV === 'development') {
    console.log(' Cloudinary configured: ', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        configured: !!process.env.CLOUDINARY_API_KEY
    });
}
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

// Create uploads directory structure .. personal storage
const personalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ride-app/drivers/personal',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { quality: 'auto: good' },
            { fetch_format: 'auto'}
        ],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `${file.fieldname}-${uniqueSuffix}`;
        }
    }
});


// cloudinary storage for vehicle doucments
const vehicleStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ride-app/drivers/vehicle',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `${file.fieldname}-${uniqueSuffix}`;
        }
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

//helpers: delete file from cloudinary

exports.deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return;
        
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(' Cloudinary delete result:', result);
        }
        
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error.message);
        throw error;
    }
};

// delete multiple files
exports.deleteMultipleFromCloudinary = async (publicIds) => {
    try {
        if (!publicIds || publicIds.length === 0) return;
        
        const deletePromises = publicIds.map(publicId => 
            exports.deleteFromCloudinary(publicId)
        );
        
        const results = await Promise.all(deletePromises);
        return results;
    } catch (error) {
        console.error(' Cloudinary bulk delete error:', error.message);
        throw error;
    }
};

//extract public ID from URL
exports.extractPublicId = (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return null;
        
        // Cloudinary URL format:
        // https://res.cloudinary.com/cloud-name/image/upload/v123456/folder/filename.jpg
        const urlParts = cloudinaryUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex === -1) return null;
        
        // Get everything after 'upload/vXXXXXX/'
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
        
        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
        
        return publicId;
    } catch (error) {
        console.error(' Error extracting public ID:', error.message);
        return null;
    }
};

