const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
}, { _id: false });

const discountSchema = new mongoose.Schema({
  type: { type: String, enum: ['pwd', 'voucher'], required: true },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: function () { return this.type === 'voucher'; },
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  fullName: { type: String },
  tableNumber: { type: String },
  items: { type: [orderItemSchema], default: [] },
  discounts: { type: [discountSchema], default: [] },
  grossTotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  netTotal: { type: Number, required: true },
  note: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing','ready','completed', 'rejected', 'cancelled'],
    default: 'pending',
  },

  payment: {
    method: { type: String },
    referenceNumber: { type: String },
    proofOfPayment: { type: String },
  },
}, { timestamps: true });

orderSchema.pre('validate', function (next) {
  this.grossTotal = this.items.reduce((s, i) => s + i.subtotal, 0);
  this.discountTotal = this.discounts.reduce((s, d) => s + d.amount, 0);
  this.netTotal = Math.max(0, this.grossTotal - this.discountTotal);
  next();
});

module.exports = mongoose.model('Order', orderSchema);
