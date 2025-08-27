const mongoose = require('mongoose');

const kitchenStaffSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /@kitchen\.com$/
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  
}, { timestamps: true });

module.exports = mongoose.model('KitchenStaff', kitchenStaffSchema);
