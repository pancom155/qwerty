const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name: {
    type: String, 
    required: true 
  },
  price: {
    type: Number, 
    required: true 
  },
  description: {
    type: String, 
    required: true 
  },
  pax: {
    type: Number, 
    required: true 
  },
  image: {
    type: String, 
    required: true 
  },
  reservation_fee: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
