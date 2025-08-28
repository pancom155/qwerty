const User = require('../models/User');
const Product = require('../models/Product');
const Table = require('../models/Table');
const Cart = require('../models/Cart');
const Voucher = require('../models/Voucher');
const PWDRequest = require('../models/PWDRequest');
const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { sendReservationEmail, sendOrderConfirmationEmail } = require('../middleware/emailService');
const moment = require('moment');

exports.renderMyReservationsPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.redirect('/login');

    // Fetch reservations for this user
    const reservations = await Reservation.find({ userId })
      .populate('tableId')
      .sort({ createdAt: -1 })
      .lean();

    res.render('user/myreservation', {
      user,
      reservations,
      moment
    });
  } catch (err) {
    console.error('My Reservation page error:', err);
    res.status(500).send('Server Error');
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const userId = req.session.user._id;
    
    // Find the reservation and verify it belongs to the user
    const reservation = await Reservation.findOne({ 
      _id: reservationId, 
      userId: userId 
    });
    
    if (!reservation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Reservation not found' 
      });
    }
    
    // Check if reservation can be cancelled (only pending reservations)
    if (reservation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending reservations can be cancelled' 
      });
    }
    
    // Update the reservation status to cancelled
    reservation.status = 'cancelled';
    await reservation.save();
    
    res.json({ 
      success: true, 
      message: 'Reservation cancelled successfully' 
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cancelling reservation' 
    });
  }
};

exports.renderUserHome = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();

    if (!user) return res.redirect('/login');

    res.render('user/index', { user });
  } catch (err) { 
    console.error('Error rendering user home:', err);
    res.status(500).send('Server Error');
  }
};

exports.renderOrderSuccess = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('items.productId').lean();

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('user/order-success', { order });
  } catch (err) {
    console.error('Order Success Page Error:', err);
    res.status(500).send('Server Error');
  }
};

exports.menuPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    const products = await Product.find({ status: 'available' }).lean();
    const cart = await Cart.findOne({ userId }).populate('items.productId').lean();

    if (!user) {
      return res.redirect('/login');
    }

    res.set('Cache-Control', 'no-store');

    res.render('user/menu', {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage || null
      },
      products,
      cart
    });
  } catch (err) {
    console.error('Error rendering menu page:', err);
    res.status(500).send('Server Error');
  }
};

exports.renderReservationPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    const tables = await Table.find().lean();

    if (!user) return res.redirect('/login');

    res.render('user/reservation', {
      user,
      tables
    });
  } catch (err) {
    console.error('Error loading reservation page:', err);
    res.status(500).send('Server Error');
  }
};

exports.viewTableDetails = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id).lean();
    const user = await User.findById(req.session.user._id).lean();

    if (!table || !user) return res.status(404).send('Table not found.');

    res.render('user/viewTable', { user, table });
  } catch (err) {
    console.error('Error fetching table details:', err);
    res.status(500).send('Server Error');
  }
};

exports.bookTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, contactNo, dineDate, dineTime, referenceNumber } = req.body;

    const table = await Table.findById(id).lean();
    if (!table) return res.status(404).send('Table not found.');

    const dineInDateTime = `${dineDate} ${dineTime}`;
    const proofPath = req.file ? req.file.filename : null;

    await Reservation.create({
      userId: req.session.user._id,
      tableId: id,
      fullName,
      email,
      phone: contactNo,
      dineInDateTime,
      referenceNumber,
      proofOfPayment: proofPath,
      totalPrice: table.price,
      reservation_fee: table.reservation_fee || 0, 
      status: 'pending'
    });

    await sendReservationEmail({ to: email, name: fullName, tableName: table.name });

    res.redirect('/user/reservation?success=1');
  } catch (err) {
    console.error('Reservation booking error:', err);
    res.status(500).send('Server error');
  }
};


exports.renderVoucherPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();

    const allVouchers = await Voucher.find({ expiryDate: { $gte: new Date() } }).lean();

    const mine = allVouchers.filter(v =>
      v.claimedBy.some(id => String(id) === String(userId)) &&
      !v.redeemedBy?.some(id => String(id) === String(userId))
    );

    const avail = allVouchers.filter(v =>
      !v.claimedBy.some(id => String(id) === String(userId))
    );

    res.render('user/voucher', { user, mine, avail, all: allVouchers });
  } catch (err) {
    console.error('Voucher page error:', err);
    res.status(500).send('Server Error');
  }
};

exports.claimVoucher = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) return res.status(404).send('Voucher not found');
    if (voucher.expiryDate < new Date()) return res.status(400).send('Voucher expired');

    const alreadyClaimed = voucher.claimedBy.some(id => id.toString() === userId.toString());
    if (alreadyClaimed) return res.status(400).send('You already claimed this voucher');

    voucher.claimedBy.push(userId);
    await voucher.save();

    res.redirect('/user/voucher?success=claim');
  } catch (err) {
    console.error('Claim voucher error:', err);
    res.status(500).send('Server Error');
  }
};


exports.renderPWDPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    const request = await PWDRequest.findOne({ userId }).sort({ createdAt: -1 });

    res.render('user/pwd', { user, request });
  } catch (err) {
    console.error('PWD page error:', err);
    res.status(500).send('Server Error');
  }
};

exports.submitPWDRequest = async (req, res) => {
  try {
    const userId = req.session.user._id;

    if (!req.file) {
      return res.redirect('/user/pwd?error=Please upload a document');
    }

    const pending = await PWDRequest.findOne({ userId, status: 'Pending' });
    if (pending) {
      return res.redirect('/user/pwd?error=You already have a pending request');
    }

    await PWDRequest.create({
      userId,
      documentPath: `uploads/${req.file.filename}`,
      status: 'Pending'
    });

    res.redirect('/user/pwd?success=Application submitted');
  } catch (err) {
    console.error('Submit PWD error:', err);
    res.status(500).send('Server Error');
  }
};

exports.renderCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    let pwdCooldownRemaining = 0;
    let pwdCountdownEnd = null;

    const cart = await Cart.findOne({ userId }).populate('items.productId').lean();
    if (!cart || !cart.items.length) return res.redirect('/user/menu');

    const items = cart.items.filter(i => i.productId).map(i => ({
      productId: i.productId._id,
      name: i.productId.name,
      image: i.productId.image || 'placeholder.png',
      price: i.productId.price,
      quantity: i.quantity,
      subtotal: i.productId.price * i.quantity
    }));

    const grossTotal = items.reduce((s, i) => s + i.subtotal, 0);

    const hasPWD = await PWDRequest.exists({ userId, status: 'Approved' });

    let pwdDiscountAmount = 0;

    if (hasPWD) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const lastPwdOrder = await Order.findOne({
        userId,
        'discounts.type': 'pwd'
      }).sort({ createdAt: -1 }).lean();

      if (lastPwdOrder) {
        const nextAvailable = new Date(lastPwdOrder.createdAt);
        nextAvailable.setDate(nextAvailable.getDate() + 1);

        if (Date.now() < nextAvailable.getTime()) {
          pwdCooldownRemaining = Math.floor((nextAvailable.getTime() - Date.now()) / 1000);
          pwdCountdownEnd = nextAvailable.toISOString();
        }
      }

      if (!pwdCooldownRemaining) {
        const alreadyUsedPWD = await Order.exists({
          userId,
          'discounts.type': 'pwd',
          createdAt: { $gte: todayStart, $lte: todayEnd }
        });

        if (!alreadyUsedPWD) {
          pwdDiscountAmount = +(grossTotal * 0.20).toFixed(2);
        }
      }
    }

    const vouchers = await Voucher.find({
      claimedBy: userId,
      expiryDate: { $gte: new Date() },
      redeemedBy: { $ne: userId }
    }).lean();

    let voucherDiscountAmount = 0;
    let voucherImage = '';
    if (req.query.voucher) {
      const selectedVoucher = vouchers.find(v => v.code === req.query.voucher);
      if (selectedVoucher && grossTotal >= selectedVoucher.minSpend) {
        voucherDiscountAmount = selectedVoucher.discount;
        voucherImage = selectedVoucher.image;
      }
    }

    const netTotal = grossTotal - pwdDiscountAmount - voucherDiscountAmount;
    const userData = await User.findById(userId).lean();

    res.render('user/placeorder', {
      items,
      grossTotal,
      pwdDiscountAmount,
      voucherDiscountAmount,
      netTotal,
      vouchers,
      voucherCode: req.query.voucher || '',
      voucherImage,
      pwdCooldownRemaining,
      pwdCountdownEnd,
      user: {
        _id: userData._id.toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.contactNo
      }
    });
  } catch (err) {
    console.error('Checkout page error:', err);
    res.status(500).send('Server Error');
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { voucherCode, referenceNumber } = req.body;

    if (!req.file) {
      return res.redirect('/user/placeorder?error=Please upload proof of payment.');
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).send('Cart is empty');
    }

    const items = cart.items.filter(i => i.productId).map(i => ({
      productId: i.productId._id,
      name: i.productId.name,
      image: i.productId.image || '',
      price: i.productId.price,
      quantity: i.quantity,
      subtotal: i.productId.price * i.quantity
    }));

    const gross = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discounts = [];

    const hasPWD = await PWDRequest.exists({ userId, status: 'Approved' });
    if (hasPWD) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const alreadyUsedPWD = await Order.exists({
        userId,
        'discounts.type': 'pwd',
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      const lastPwdOrder = await Order.findOne({
        userId,
        'discounts.type': 'pwd'
      }).sort({ createdAt: -1 }).lean();

      let pwdEligible = true;
      if (lastPwdOrder) {
        const nextEligible = new Date(lastPwdOrder.createdAt);
        nextEligible.setDate(nextEligible.getDate() + 1);
        if (Date.now() < nextEligible.getTime()) {
          pwdEligible = false;
        }
      }

      if (!alreadyUsedPWD && pwdEligible) {
        discounts.push({
          type: 'pwd',
          amount: +(gross * 0.20).toFixed(2),
          description: 'PWD 20% discount'
        });
      }
    }

    let voucher;
    if (voucherCode) {
      voucher = await Voucher.findOne({
        code: voucherCode,
        claimedBy: userId,
        expiryDate: { $gte: new Date() },
        redeemedBy: { $ne: userId }
      });

      if (!voucher) {
        return res.redirect('/user/placeorder?error=Invalid or already used voucher.');
      }

      if (gross < voucher.minSpend) {
        return res.redirect(`/user/placeorder?error=Minimum spend not met for voucher (₱${voucher.minSpend}).`);
      }

      discounts.push({
        type: 'voucher',
        voucherId: voucher._id,
        amount: voucher.discount,
        description: `Voucher ${voucher.code}`
      });

      // Mark voucher as redeemed by user
      await Voucher.updateOne(
        { _id: voucher._id },
        { $addToSet: { redeemedBy: userId } }
      );
    }

    const newOrder = await Order.create({
      userId,
      items,
      discounts,
      payment: {
        referenceNumber,
        proofOfPayment: req.file.filename
      }
    });

    cart.items = [];
    await cart.save();

    const user = await User.findById(userId).lean();
    await sendOrderConfirmationEmail({
      to: user.email,
      name: `${user.firstName} ${user.lastName}`,
      orderId: newOrder._id
    });

    res.redirect(`/user/order-success/${newOrder._id}`);
  } catch (err) {
    console.error('Place-order error:', err);
    res.status(500).send('Server Error');
  }
};

exports.renderOrdersPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.redirect('/login');

    const orders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .populate('items.productId') 
    .lean();

    res.render('user/orders', {
      user,
      orders,
      moment
    });
  } catch (err) {
    console.error('Orders page error:', err);
    res.status(500).send('Server Error');
  }
};
exports.getReviewsPage = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      return res.redirect('/login');
    }

    const userId = req.session.user._id;

    // Fetch full user with profileImage and other fields
    const user = await User.findById(userId).lean();

    const completedOrders = await Order.find({
      userId,
      status: 'completed',
      'items.0': { $exists: true }
    })
      .populate('items.productId')
      .lean();

    const userReviews = await Review.find({ userId }).lean();
    const reviewsMap = {};
    userReviews.forEach(review => {
      reviewsMap[review.orderId.toString()] = review;
    });

    res.render('user/reviews', { completedOrders, user, reviewsMap });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).send('Server Error');
  }
};


exports.submitReview = async (req, res) => {
  const { orderId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.session.user && req.session.user._id;
  if (!userId) return res.redirect('/login');

  try {
    const existing = await Review.findOne({ userId, orderId });
    if (existing) {
      return res.status(400).send('You already submitted a review for this order.');
    }

    const newReview = new Review({
      userId,
      orderId,
      rating,
      comment
    });

    await newReview.save();

    res.redirect('/user/reviews?success=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while submitting your review.');
  }
};


/* -------------------- PROFILE -------------------- */
exports.renderProfilePage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();
    if (!user) return res.redirect('/login');
    res.render('user/profile', { user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.renderEditProfilePage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();
    if (!user) return res.redirect('/login');
    res.render('user/editProfile', { user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, address, contactNo } = req.body;
    const updateData = { firstName, lastName, address, contactNo };

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    await User.findByIdAndUpdate(req.session.user._id, updateData, { new: true });
    res.redirect('/user/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating profile');
  }
};