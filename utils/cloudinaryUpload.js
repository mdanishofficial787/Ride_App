const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Upload single file to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: `${Date.now()}-${filename}`,
                resource_type: 'auto',
                transformation: [
                    { width: 1000, height: 1000, crop: 'limit' },
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

// Upload multiple files to Cloudinary
const uploadMultipleToCloudinary = async (files) => {
    const uploadedUrls = {};

    // ✅ Explicit list — don't rely on string matching
    const vehicleFields = [
        'registrationDocument', 'vehicleFrontImage',
        'vehicleBackImage', 'vehicleLeftImage', 'vehicleRightImage'
    ];

    for (const fieldName in files) {
        if (files[fieldName] && files[fieldName][0]) {
            const file = files[fieldName][0];

            // ✅ Safety check - memoryStorage must provide buffer
            if (!file.buffer) {
                throw new Error(`No buffer for field "${fieldName}". Check multer is using memoryStorage.`);
            }

            const folder = vehicleFields.includes(fieldName)
                ? 'ride-app/drivers/vehicle'
                : 'ride-app/drivers/personal';

            try {
                const url = await uploadToCloudinary(file.buffer, folder, file.originalname);
                uploadedUrls[fieldName] = url;
            } catch (error) {
                throw new Error(`Failed to upload ${fieldName}: ${error.message}`);
            }
        }
    }

    return uploadedUrls;
};
// Delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
    try {
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts.slice(-3, -1).join('/');
        const publicId = `${folder}/${filename}`;
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
};

module.exports = {
    uploadToCloudinary,
    uploadMultipleToCloudinary,
    deleteFromCloudinary
};