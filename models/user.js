const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
//const { version } = require('os');


const UserSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: [true, 'Please provide your full name'],
            trim: true
        },

        mobile: {
            type: String,
            required: [true, 'Please provide a mobile number'],
            unique: true,
            match: [/^[0-9]{11}$/, 'Please provide a valid 11-digit mobile number']

        },

        email: {
            type: String,
            lowercase: true,
            required: [true, 'Please provide an email address'],
            trim: true,
            unique:true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email'
            ]
        },

        gender: {
            type: String,
            enum: ['male', 'female', 'Other'],
            required: [true, 'Select']
        },

        
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must include 6 characters'],
            select: false // don't return password in queries by default
        },

        

        // usertype

        userType: {
            type: String,
            enum: ['driver', 'customer','admin'],
            //default: 'customer',
            required: [true, 'Please specify user type (driver or customer)'],
            index: true
        },

        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        }, 
        isemailverified:{
            type: Boolean,
            default: false,
        },

        emailVerificationOTP: String,
        emailOTPExpire: Date,


        isActive: {
            type: Boolean,
            default: true
        },

        //session Token
        sessionToken: String,
        // reset passwords .....
        // session management ....
        selectedRole: {
            type: String,
            enum: ['driver', 'customer', 'admin'],
            default: null
        },
        isTemporary: {
            type: Boolean,
            default: false
        },

        //admin specific fields
        adminApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        adminApprovedAt: Date,

        //Timestamp for role selection (for temporary users)
        roleSelectedAt: Date

    },

    
    {
        timestamps: true,
        //toJSON: {virtuals: true},
        //toObject: {virtuals: true}
    }
);
// hashing password before saving for security
UserSchema.pre('save', async function () {
    if(!this.isModified('password')) {
        return;
    }

    
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
});
// generating JWT Token
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        {id: this._id, userType: this.userType, role: this.role },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};
// comapre password 
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generating email verification OTP
UserSchema.methods.generateEmailVerificationOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();  // 6 digit otp generation

    // hashing otp and storing hashed value in emailVerificationOTP field
    this.emailVerificationOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    // otp expiry time setting (5 minutes)
    this.emailOTPExpire = Date.now() + 5 * 60 * 1000;
    return otp;

};

// session token
UserSchema.methods.generateSessionToken = function (){
    const sessionToken = crypto.randomBytes(32).toString('hex');
    this.sessionToken = sessionToken;
    return sessionToken;
}; 


// get welome Screen options
UserSchema.statics.getWelcomeScreenOptions = function() {
    return {
        AppName: 'Ride App',
        version: '1.0.0',
        message: 'Welcome to Ride App! select how you want to sign up.',
        options: [
            {
                id: 'driver',
                title: 'SignUp as Driver',
                description: 'Start earning by offering rides',
                icon: '🚗' 
            },
            {
                id: 'customer',
                title: 'SignUp as Customer',
                description: 'Book rides anytime, anywhere',
                icon: '👤'
            }
        ]
    };
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);