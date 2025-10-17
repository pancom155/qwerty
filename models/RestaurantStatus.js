const mongoose = require('mongoose');

const restaurantStatusSchema = new mongoose.Schema({
  isOpen: {
    type: Boolean,
    default: true // restaurant is open by default
  }
});

module.exports = mongoose.model('RestaurantStatus', restaurantStatusSchema);
