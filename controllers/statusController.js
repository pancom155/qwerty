const RestaurantStatus = require('../models/RestaurantStatus');

// Get current status
exports.getStatus = async (req, res) => {
  try {
    let status = await RestaurantStatus.findOne();
    if (!status) {
      status = await RestaurantStatus.create({ isOpen: true });
    }
    res.json({ isOpen: status.isOpen });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

// Toggle open/close
exports.toggleStatus = async (req, res) => {
  try {
    let status = await RestaurantStatus.findOne();
    if (!status) status = await RestaurantStatus.create({ isOpen: true });

    status.isOpen = !status.isOpen;
    await status.save();

    res.json({ message: `Restaurant is now ${status.isOpen ? 'open' : 'closed'}`, isOpen: status.isOpen });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};
