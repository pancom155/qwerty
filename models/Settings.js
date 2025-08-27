const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  logo: {
    type: String,
    default: ''
  },
  reservationQR: {
    type: String,
    default: ''
  },
  orderQR: { // ✅ Add this
    type: String,
    default: ''
  },
  siteName: {
    type: String,
    default: 'DineHub'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
