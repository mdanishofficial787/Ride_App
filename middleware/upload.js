const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './uploads/drivers';
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    //alowed file types
    const allowedTypes = /jpeg|jpg|png/;
    //check extension
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    //check mime type
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only .jpg, .jpeg, and .png  image files are allowed!'));
    }
};

//configure multer
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024  // 5MB file size limit
    }, 
    fileFilter: fileFilter
});

exports.uploadDriverImages = upload.fields([
    {name: 'driverImage', maxCount: 1},
    {name: 'vehicleImage', maxCount: 1}
]);

// handling middleware errors
exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File size too large. Maximum file size is 5MB.',
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