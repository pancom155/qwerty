const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    match: /@staff\.com$/
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
