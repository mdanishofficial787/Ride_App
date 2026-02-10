const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'User refernce is required'],
    unique: true
  },
// personal information required
  cnic: {
    type: String,
    required: [true, 'Please provide CNIC number'],
    unique: true,
    match: [/^[0-9]{13}$/, 'CNIC must be exactly 13 digits'],
    trim: true
  },
  driverImage: {
    type: String,
    required: [true, 'Please upload driver image']
  },

  //vehicle information

  vehicleType: {
    type: String,
    enum: ['car', 'bike', 'rickshaw', 'van'],
    required: [true, 'Please select vehicle type']
  },

  vehicleLincenseNumber: {
    type: String,
    required: [true, 'Please provide vehicle lincense number'],
    unique: true,
    uppercase: true,
    trim: true
  },

  vehicleRegistrationNumber: {
    type: String,
    required: [true,'Please provide vehicle registration number'],
    unique: true,
    uppercase: true,
    trim: true
  },

  vehicleImage: {
    type: String,
    required: [true, 'Please upload vehicle image']
  },

  //profile status

  profileStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  //verification details
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  rejectedReason: {
    type: String
  },

  // driver status and availability

  isAvailable: {
    type: Boolean,
    defualt: false
  },

  currentlocation: {
    type: {
      type: String,
      enum: ['Point'],
      defualt: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },

  //statistics

  totalRides: {
    type: Number,
    defualt: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalRatings: {
    type: Number,
    default: 0
  }
},
  {
    timestamps: true
  }

);

//index for geospatial queries
driverSchema.index({ currentlocation: '2dsphere'});

//Index for profile status queries
driverSchema.index({ profileStatus: 1});

//index for user reference
driverSchema.index({user: 1});

module.exports = mongoose.model("Driver", driverSchema);