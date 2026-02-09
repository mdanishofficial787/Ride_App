const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

//const mongoSanitize = require('express-mongo-sanitize');
//const helmet = require('helmet');
//const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load environment variables FIRST
dotenv.config({ path: './config/config.env' });

// Initialize express app
const app = express();


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Connect to database
connectDB();

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
   app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Sanitize data (prevent MongoDB injection)
//app.use(mongoSanitize());

// Set security headers
//app.use(helmet());


// Test route
app.use('/api/auth', require('./routes/authRoutes'));


//test
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ride App API is running!',
    version: '1.0.0'
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      auth: [
        'POST /api/auth/signup',
        'POST /api/auth/verify-otp'
      ]
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});