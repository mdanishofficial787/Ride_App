const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');


// Load environment variables FIRST
dotenv.config({ path: './config/config.env' });

// Initialize express app
const app = express()
//connect to database
connectDB();

//Middleware
// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:19006',
    process.env.FRONTEND_URL  // Your frontend URL (added later)
].filter(Boolean);

// Enable CORS
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) == -1) {
            return callback(new Error('CORS poicy violation'), false);
        }
        
        return callback(null, true);
    },
    credentials: true
}));


// Development logging middleware
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


// mount api routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// serve upload files statically
app.use('/uploads', express.static('uploads'));


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
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});


// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

//handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaughr Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;