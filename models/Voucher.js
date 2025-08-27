const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discount: {
    type: Number,
    required: true
  },
  minSpend: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  image: {
    type: String,
    default: 'voucher-placeholder.png'
  },
  claimedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  redeemedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  createdAt: { type: Date, default: Date.now }
});

voucherSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Voucher', voucherSchema);
