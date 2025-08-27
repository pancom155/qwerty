const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  address: { type: String, required: true },
  contactNo: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    default: null
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'],
    default: 'user' 
  },
  otpExpires: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: true
  },
    profileImage: {
    type: String,  
    default: null  
  }
});


module.exports = mongoose.model('User', userSchema);
