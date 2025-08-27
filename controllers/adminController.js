const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const Staff = require('../models/Staff');
const Settings = require('../models/Settings');
const Waiter = require('../models/Waiter');
const Review = require('../models/Review');
const Voucher = require('../models/Voucher');
const KitchenStaff = require('../models/KitchenStaff');
const PWDRequest = require('../models/PWDRequest');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const {sendUserBlockedEmail, sendUserUnblockedEmail  } = require('../middleware/emailService');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

exports.getDashboard = (req, res) => {
    res.render('admin/index');
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } });
    res.render('admin/users', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin/users', { users: [] });
  }
};

exports.blockUser = async (req, res) => {
  console.log('Blocking user:', req.params.id); 
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: false }, { new: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Send block email
    await transporter.sendMail({
      from: `"DineHub Admin" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Account Blocked - DineHub',
      html: `
        <p>Dear ${user.firstName || 'User'},</p>
        <p>Your DineHub account has been <strong>blocked</strong> by the administrator. You will not be able to log in until your account is unblocked.</p>
        <p>If you believe this is a mistake, please contact support.</p>
        <br>
        <p>Best regards,<br>DineHub Team</p>
      `
    });

    res.status(200).json({ success: true, message: 'User successfully blocked and notified via email.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, message: 'Failed to block user.' });
  }
};

exports.unblockUser = async (req, res) => {
  console.log('Unblocking user:', req.params.id);
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Send unblock email
    await transporter.sendMail({
      from: `"DineHub Admin" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Account Unblocked - DineHub',
      html: `
        <p>Dear ${user.firstName || 'User'},</p>
        <p>Good news! Your DineHub account has been <strong>unblocked</strong> and you can now log in again.</p>
        <p>Welcome back, and happy dining!</p>
        <br>
        <p>Best regards,<br>DineHub Team</p>
      `
    });

    res.status(200).json({ success: true, message: 'User successfully unblocked and notified via email.' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock user.' });
  }
};
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    const { success, error, editSuccess } = req.query;

    res.render('admin/products', {
      products,
      success,
      error,
      editSuccess 
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/index?error=Unable to load products');
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, description, price, category, status } = req.body;
    const image = req.file ? req.file.filename : null;

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      image,
      status: status || 'available'
    });

    await newProduct.save();
    req.session.success = 'Product added successfully!';
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).send('Failed to add product.');
  }
};

exports.editProduct = async (req, res) => {
  const { id } = req.params;
  const { name, category, price, status, description } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) return res.redirect('/admin/products?error=Product not found');

    product.name = name;
    product.category = category;
    product.price = price;
    product.status = status || product.status;
    product.description = description;

    if (req.file) {
      const oldImagePath = path.join(__dirname, '..', 'public', 'uploads', product.image);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      product.image = req.file.filename;
    }

    await product.save();
    return res.redirect('/admin/products?editSuccess=Product updated successfully');
  } catch (error) {
    console.error(error);
    return res.redirect('/admin/products?error=Something went wrong');
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.session.success = 'Product deleted successfully!';
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send('Failed to delete product.');
  }
};

exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    product.status = product.status === 'available' ? 'unavailable' : 'available';
    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/products');
  }
};

exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find();
    const waiters = await Waiter.find();
    const kitchens = await KitchenStaff.find();
    const success = req.session.success;
    delete req.session.success;

    res.render('admin/staff', { staff, waiters, kitchens, success });
  } catch (err) {
    console.error('Error loading staff page:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.createAccount = async (req, res) => {
  const { role, name, email, password } = req.body;

  if (!role || !name || !email || !password) {
    return res.status(400).send('All fields are required.');
  }

  const Model = role === 'staff' ? Staff :
                role === 'waiter' ? Waiter :
                role === 'kitchen' ? KitchenStaff :
                null;

  if (!Model) return res.status(400).send('Invalid role.');

  const isValidEmail = (role === 'staff' && email.endsWith('@staff.com')) ||
                       (role === 'waiter' && email.endsWith('@waiter.com')) ||
                       (role === 'kitchen' && email.endsWith('@kitchen.com'));

  if (!isValidEmail) {
    return res.status(400).send(`${role} email must end with @${role}.com`);
  }

  try {
    const existing = await Model.findOne({ email });
    if (existing) return res.status(400).send('Email already exists.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Model({ fullName: name, email, password: hashedPassword });
    await newUser.save();

    req.session.success = `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`;
    res.redirect('/admin/staff');
  } catch (err) {
    console.error('Error creating account:', err);
    res.redirect('/admin/staff');
  }
};

exports.editAccount = async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  const Model = role === 'staff' ? Staff :
                role === 'waiter' ? Waiter :
                role === 'kitchen' ? KitchenStaff :
                null;

  if (!Model) return res.status(400).send('Invalid role.');

  try {
    const user = await Model.findById(id);
    if (!user) return res.status(404).send('User not found.');

    const valid = (role === 'staff' && email.endsWith('@staff.com')) ||
                  (role === 'waiter' && email.endsWith('@waiter.com')) ||
                  (role === 'kitchen' && email.endsWith('@kitchen.com'));

    if (!valid) return res.status(400).send(`${role} email must end with @${role}.com`);

    user.fullName = name;
    user.email = email;
    await user.save();

    req.session.success = `${role.charAt(0).toUpperCase() + role.slice(1)} account updated successfully!`;
    res.redirect('/admin/staff');
  } catch (err) {
    console.error('Error editing account:', err);
    res.redirect('/admin/staff');
  }
};

exports.deleteAccount = async (req, res) => {
  const { id } = req.params;
  const { role } = req.query;

  const Model = role === 'staff' ? Staff :
                role === 'waiter' ? Waiter :
                role === 'kitchen' ? KitchenStaff :
                null;

  if (!Model) return res.status(400).send('Invalid role.');

  try {
    await Model.findByIdAndDelete(id);
    req.session.success = `${role.charAt(0).toUpperCase() + role.slice(1)} account deleted successfully!`;
    res.redirect('/admin/staff');
  } catch (err) {
    console.error('Error deleting account:', err);
    res.redirect('/admin/staff');
  }
};

exports.getTable = async (req, res) => {
  try {
    const tables = await Table.find().sort({ createdAt: -1 });
    res.render('admin/table', { tables });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
exports.createTable = async (req, res) => {
  const { name, price, reservation_fee, description, pax } = req.body;
  const image = req.file?.filename;

  if (!name || !price || !reservation_fee || !description || !pax || !image) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const newTable = new Table({
      name,
      price,
      reservation_fee,
      description,
      pax,
      image
    });

    await newTable.save();
    req.session.success = 'Table added successfully!';
    res.redirect('/admin/table');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.editTable = async (req, res) => {
  const { id } = req.params;
  const { name, price, reservation_fee, description, pax } = req.body;
  const image = req.file?.filename;

  try {
    const table = await Table.findById(id);
    if (!table) return res.status(404).send('Table not found');

    table.name = name;
    table.price = price;
    table.reservation_fee = reservation_fee;
    table.description = description;
    table.pax = pax;
    if (image) table.image = image;

    await table.save();
    req.session.success = 'Table updated successfully!';
    res.redirect('/admin/table');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


exports.deleteTable = async (req, res) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    req.session.success = 'Table deleted successfully!';
    res.redirect('/admin/table');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      status: { $in: ['pending', 'confirmed', 'cancelled', 'done'] }
    })
      .populate('userId', 'firstName lastName email')
      .populate('tableId', 'name price')
      .sort({ createdAt: -1 });

    res.render('admin/reservation', { reservations });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.render('admin/reservation', { reservations: [] });
  }
};
exports.getReservation_done = async (req, res) => {
  try {
    const reservations = await Reservation.find({ status: 'done' })
      .populate('userId', 'firstName lastName email')
      .populate('tableId', 'name price')
      .sort({ createdAt: -1 });

    res.render('admin/reservation_done', { reservations });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.render('admin/reservation_done', { reservations: [] });
  }
};

exports.getReservation_cancelled = async (req, res) => {
  try {
    const reservations = await Reservation.find({ status: 'cancelled' })
      .populate('userId', 'firstName lastName email')
      .populate('tableId', 'name price')
      .sort({ createdAt: -1 });

    res.render('admin/reservation_cancelled', { reservations });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.render('admin/reservation_cancelled', { reservations: [] });
  }
};



exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const validActions = ['pending', 'confirmed', 'cancelled', 'done'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid status action.' });
    }

    const updated = await Reservation.findByIdAndUpdate(
      id,
      {
        status: action,
        completedAt: action === 'done' ? new Date() : null
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    res.json({ message: `Status updated to ${action}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getDiscountPage = async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({ expiryDate: { $gte: now } }).lean();
    const pwdRequests = await PWDRequest.find().populate('userId').lean();
    res.render('admin/discounts', { vouchers, pwdRequests });
  } catch (err) {
    console.error('Error loading discounts page:', err);
    res.status(500).send('Server Error');
  }
};

exports.createVoucher = async (req, res) => {
  try {
    const { code, discount, minSpend, expiryDate } = req.body;

    // Check if voucher code already exists
    const existingVoucher = await Voucher.findOne({ code });
    if (existingVoucher) {
      return res.status(400).send('Voucher code already exists');
    }

    // Get all user IDs
    const users = await User.find({}, '_id');
    const claimedByAll = users.map(user => user._id);

    // Create ONE voucher document for all users
    await Voucher.create({
      code,
      discount,
      minSpend: minSpend || 0,
      expiryDate,
      image: req.file
        ? path.posix.join('uploads', req.file.filename)
        : 'images/voucher-placeholder.png',
      claimedBy: claimedByAll,
      isRedeemed: false
    });

    res.redirect('/admin/discounts?success=create');
  } catch (err) {
    console.error('Error creating voucher:', err);
    res.status(500).send('Server Error');
  }
};

exports.updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discount, minSpend, expiryDate } = req.body;

    const data = { code, discount, minSpend: minSpend || 0, expiryDate };

    if (req.file) {
      data.image = path.posix.join('uploads', req.file.filename); 
    }

    await Voucher.findByIdAndUpdate(id, data, { runValidators: true });
    res.redirect('/admin/discounts?success=update');
  } catch (err) {
    console.error('Error updating voucher:', err);
    res.status(500).send('Server Error');
  }
};

exports.deleteVoucher = async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.redirect('/admin/discounts?success=delete');
  } catch (err) {
    console.error('Error deleting voucher:', err);
    res.status(500).send('Server Error');
  }
};


exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'firstName lastName email')
      .populate({
        path: 'orderId',
        populate: {
          path: 'items.productId',
          model: 'Product',
          select: 'image name'
        }
      })
      .lean(); // para mas malinis ilabas sa EJS

    res.render('admin/reviews', { reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send('Server Error');
  }
};



exports.getOrdersPage = async (req, res) => {
  try {
    const allOrders = await Order.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email') 
      .populate('items.productId', 'image name')
      .lean();

    res.render('admin/orders', { allOrders });
  } catch (err) {
    console.error('Error loading admin orders page:', err);
    res.status(500).send('Server Error');
  }
};
exports.getOrders_rejected = async (req, res) => {
  try {
    const allOrders = await Order.find({ status: 'rejected' })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email') 
      .populate('items.productId', 'image name')
      .lean();

    res.render('admin/orders', { allOrders });
  } catch (err) {
    console.error('Error loading admin orders page:', err);
    res.status(500).send('Server Error');
  }
};
exports.getOrders_pending = async (req, res) => {
  try {
    const allOrders = await Order.find({ status: { $in: ['pending', 'processing', 'ready_to_pickup'] } })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email') 
      .populate('items.productId', 'image name')
      .lean();

    res.render('admin/orders', { allOrders });
  } catch (err) {
    console.error('Error loading admin orders page:', err);
    res.status(500).send('Server Error');
  }
};


exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne() || { logo: '', reservationQR: '' };

    res.render('admin/settings', {
      settings,
      success: req.query.success,
      error: req.query.error
    });
  } catch (err) {
    console.error('Error loading settings:', err);
    res.render('admin/settings', {
      settings: { logo: '', reservationQR: '' },
      error: 'Failed to load settings.'
    });
  }
};


exports.uploadLogo = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.redirect('/admin/settings?error=No file uploaded');
    }

    const logoPath = '/uploads/' + req.file.filename;

    // Try to find existing settings
    let settings = await Settings.findOne();

    if (!settings) {
      // Create if not exists
      settings = new Settings({ logo: logoPath });
    } else {
      // Update existing logo
      settings.logo = logoPath;
    }

    await settings.save();

    // Redirect with success message
    res.redirect('/admin/settings?success=Logo uploaded successfully');
  } catch (err) {
    console.error('Error uploading logo:', err);
    res.redirect('/admin/settings?error=Something went wrong');
  }
};



exports.uploadReservationQR = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/settings?error=No QR code uploaded');
    }

    const qrPath = '/uploads/' + req.file.filename;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ reservationQR: qrPath });
    } else {
      settings.reservationQR = qrPath;
    }

    await settings.save();
    res.redirect('/admin/settings?success=Reservation QR code uploaded successfully');
  } catch (err) {
    console.error('Error uploading reservation QR:', err);
    res.redirect('/admin/settings?error=Error uploading reservation QR');
  }
};


exports.getReservationPage = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    // If no settings found, create a dummy object with default QR path
    if (!settings) {
      settings = { reservationQR: '/images/sampleQr.jpg' };
    } else if (!settings.reservationQR) {
      settings.reservationQR = '/images/sampleQr.jpg';
    }

    res.render('user/reservation', { settings });
  } catch (err) {
    console.error('Failed to load QR:', err);
    res.render('user/reservation', { settings: { reservationQR: '/images/sampleQr.jpg' } });
  }
};


exports.uploadOrderQR = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/settings?error=No Order QR code uploaded');
    }

    const qrPath = '/uploads/' + req.file.filename;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ orderQR: qrPath });
    } else {
      settings.orderQR = qrPath;
    }

    await settings.save();
    res.redirect('/admin/settings?success=Order QR code uploaded successfully');
  } catch (err) {
    console.error('Error uploading order QR:', err);
    res.redirect('/admin/settings?error=Error uploading order QR');
  }
};
