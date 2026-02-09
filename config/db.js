const mongoose = require('mongoose');
const User = require('../models/user');
const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await User.createCollection(); // Ensure indexes are created
        console.log('User collection created successfully.');

    } catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
};
module.exports = connectDB;