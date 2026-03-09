const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

// Get encryption key from environment
const getKey = (salt) => {
    return crypto.pbkdf2Sync(
        process.env.ENCRYPTION_SECRET,
        salt,
        100000,
        32,
        'sha512'
    );
};

/**
 * Encrypt sensitive data (CNIC, documents)
 * @param {String} text - Plain text to encrypt
 * @returns {String} - Encrypted string with salt, iv, and tag
 */
exports.encrypt = (text) => {
    if (!text) return null;

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(String(text), 'utf8'),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
};

/**
 * Decrypt sensitive data
 * @param {String} encryptedData - Encrypted string
 * @returns {String} - Decrypted plain text
 */
exports.decrypt = (encryptedData) => {
    if (!encryptedData) return null;

    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, TAG_POSITION);
    const tag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = buffer.slice(ENCRYPTED_POSITION);

    const key = getKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
};

/**
 * Mask CNIC (show only last 4 digits)
 * @param {String} cnic - CNIC number
 * @returns {String} - Masked CNIC
 */
exports.maskCNIC = (cnic) => {
    if (!cnic || cnic.length < 13) return '****-****-****';
    return `****-****-${cnic.slice(-4)}`;
};

/**
 * Hash data (one-way, for comparison only)
 * @param {String} data - Data to hash
 * @returns {String} - Hashed data
 */
exports.hashData = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};