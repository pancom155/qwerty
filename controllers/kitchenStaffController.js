
const Order = require('../models/Order'); // adjust path as needed

exports.getKitchenDashboard = async (req, res) => {
  try {
    const processingOrders = await Order.find({ status: 'processing' })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'image name')
      .lean();

    res.render('kitchen/index', {
      title: 'Kitchen Staff Dashboard',
      user: req.session.user,
      orders: processingOrders
    });
  } catch (err) {
    console.error('Error rendering /kitchen/index.ejs:', err);
    res.status(500).send('Internal Server Error');
  }
};



