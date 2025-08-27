const mongoose = require('mongoose');

const waiterSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    match: /@waiter\.com$/
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

module.exports = mongoose.model('Waiter', waiterSchema);
