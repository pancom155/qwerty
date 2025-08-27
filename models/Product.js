const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true 
  },
  category: {
    type: String,
    enum: ['seafood', 'appetizer', 'meat', 'vegetable', 'dessert', 'beverage'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
