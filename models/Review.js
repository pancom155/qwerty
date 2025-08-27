const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  orderId: { type: Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true },
  rating: { 
    type: Number, 
    required: true 
  },
  comment: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);