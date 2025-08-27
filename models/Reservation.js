const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tableId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  fullName:       { type: String, required: true, trim: true },
  email:          { type: String, required: true, lowercase: true, trim: true },
  phone:          { type: String, trim: true, default: '' },
  dineInDateTime: { type: String, required: true, trim: true },
  referenceNumber:{ type: String, required: true, trim: true },
  proofOfPayment: { type: String, required: true },
  totalPrice:     { type: Number, required: true },
  reservation_fee:{ type: Number, required: true },
  status:         { type: String, enum: ['pending', 'confirmed', 'cancelled', 'done'], default: 'pending' },
  completedAt:    { type: Date, default: null },
  createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);
