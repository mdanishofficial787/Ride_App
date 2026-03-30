const mongoose = require('mongoose');
const User = require('../models/user');
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await User.createCollection(); // Ensure indexes are created
        console.log('User collection created successfully.');

    } catch (error) {
        console.log(`Error: ${error.message}`);
        console.error('Error Details:', {
            name: error.name,
            code: error.code,
            codeName: error.codeName
        });
        process.exit(1);
    }
    
};
module.exports = connectDB;