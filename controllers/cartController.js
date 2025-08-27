const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.addToCart = async (req, res) => {
  const userId = req.session.user?._id;
  const { productId } = req.body;

  if (!userId) return res.redirect('/login');

  if (!productId || productId === 'null' || productId.trim() === '') {
    console.warn('[Add to Cart] Attempted to add invalid productId:', productId);
    return res.redirect('/user/menu');
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      console.warn('[Add to Cart] Product not found:', productId);
      return res.redirect('/user/menu');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId?.toString() === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    await cart.save();
    res.redirect('/user/menu');
  } catch (err) {
    console.error('Add to Cart Error:', err);
    res.status(500).send('Server Error');
  }
};

exports.getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user._id });
    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    res.json({ count });
  } catch (err) {
    console.error('Error getting cart count:', err);
    res.status(500).json({ count: 0 });
  }
};

exports.removeFromCart = async (req, res) => {
  const userId = req.session.user._id;
  const { productId } = req.body;

  try {
    await Cart.updateOne(
      { userId },
      { $pull: { items: { productId } } }
    );
    res.redirect('/menu');
  } catch (err) {
    console.error('Remove from Cart Error:', err);
    res.status(500).send('Server Error');
  }
};

exports.getCartItems = async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.json([]);

  try {
    const cart = await Cart.findOne({ userId }).populate('items.productId').lean();
    console.log('[Cart Items]', cart?.items);
    res.json(cart?.items || []);
  } catch (err) {
    console.error('Error loading cart items:', err);
    res.status(500).json([]);
  }
};

exports.increaseQuantity = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user?._id;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  try {
    await Cart.updateOne(
      { userId, 'items.productId': productId },
      { $inc: { 'items.$.quantity': 1 } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Increase quantity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.decreaseQuantity = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user?._id;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  try {
    const cart = await Cart.findOne({ userId });

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (item) {
      if (item.quantity <= 1) {
        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
      } else {
        item.quantity -= 1;
      }
      await cart.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Decrease quantity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


