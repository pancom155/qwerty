const Order = require('../models/Order');
const Product = require('../models/Product');



exports.getWaiterDashboard = async (req, res) => {
  try {
    const dineInOrders = await Order.find({ 'dineIn.isDineIn': true })
      .sort({ createdAt: -1 })
      .populate('orderItems.productId');

    const products = await Product.find({ status: 'available' });

    res.render('waiter/index', {
      user: req.session.user,
      dineInOrders,
      products
    });
  } catch (error) {
    console.error('Error loading waiter dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.render('waiter/index', {
      user: req.session.user,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
exports.getProductsByCategory = async (req, res) => {
  const category = req.params.category;
  const validCategories = ['seafood', 'appetizer', 'meat', 'vegetable', 'dessert', 'beverage'];

  if (!validCategories.includes(category)) {
    return res.status(400).send('Invalid category');
  }

  const products = await Product.find({ category }).lean();
  res.render('waiter/index', {
    user: req.session.user,
    products,
  });
};

exports.placeOrder = async (req, res) => {
  try {
    const {
      fullName = 'NA',
      items = [],
      discounts = [],
      payment = {},
      tableNumber = null,
      status = 'processing'
    } = req.body;

    // Sanitize and validate items
    const validItems = items.map(item => ({
      productId: item?.productId || null,
      name: item?.name?.trim() || 'NA',
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity) || 0,
      subtotal: Number(item?.subtotal) || 0,
    }));

    const hasInvalidItem = validItems.some(item =>
      !item.productId || item.quantity < 1 || item.price < 0
    );

    if (hasInvalidItem) {
      return res.status(400).json({ message: 'Invalid item: missing productId or quantity < 1' });
    }

    // Sanitize discounts
    const validDiscounts = (discounts || []).map(d => ({
      type: d?.type,
      voucherId: d?.voucherId || undefined,
      amount: Number(d?.amount) || 0,
      description: d?.description?.trim() || '',
    }));

    const newOrder = new Order({
      fullName: fullName.trim(),
      tableNumber: tableNumber || null,
      items: validItems,
      discounts: validDiscounts,
      payment: {
        method: payment?.method?.trim() || 'cash',
        referenceNumber: payment?.referenceNumber?.trim() || 'NA',
        proofOfPayment: payment?.proofOfPayment?.trim() || 'NA',
      },
      status
    });

    await newOrder.save();

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: newOrder._id
    });
  } catch (err) {
    console.error('Order placement error:', err);
    res.status(500).json({ message: 'Failed to place order' });
  }
};
