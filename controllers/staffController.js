const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const CustomerSupport = require('../models/CustomerSupport');
const User = require('../models/User');
const { sendReservationConfirmedEmail, sendRejectionEmail, sendOrderProcessedEmail, sendOrderRejectedEmail, sendOrderCompletedEmail, sendReadyToPickupEmail } = require('../middleware/emailService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings'); 
exports.renderStaffDashboard = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Kunin lang ang orders at reservations sa current month
    const [orders, reservations] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfMonth, $lt: endOfMonth } }).lean(),
      Reservation.find({ createdAt: { $gte: startOfMonth, $lt: endOfMonth } }).lean()
    ]);

    const orderStats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      processingOrders: orders.filter(o => o.status === 'processing').length,
      readyToPickupOrders: orders.filter(o => o.status === 'ready_to_pickup').length,
      completedOrders: orders.filter(o => o.status === 'completed').length
    };

    const reservationStats = {
      totalReservations: reservations.length,
      pendingReservations: reservations.filter(r => r.status === 'pending').length,
      confirmedReservations: reservations.filter(r => r.status === 'confirmed').length
    };

    res.render('staff/index', {
      user: req.session.user,
      ...orderStats,
      ...reservationStats
    });

  } catch (err) {
    console.error('Dashboard fetch error:', err);

    res.render('staff/index', {
      user: req.session.user,
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      readyToPickupOrders: 0,
      completedOrders: 0,
      totalReservations: 0,
      pendingReservations: 0,
      confirmedReservations: 0
    });
  }
};

exports.getOrders = async (req, res) => {
  try {

    const orders = await Order.find({
      status: { $in: ['pending', 'processing', 'ready_to_pickup'] }
    })
      .populate('userId', 'firstName lastName email') 
      .populate('items.productId', 'image name')    
      .sort({ createdAt: -1 })                      
      .lean();

    const updatedOrders = orders.map(order => {

      order.grossTotal = order.grossTotal ?? order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);


      order.discountTotal = order.discountTotal ?? (order.discounts ? order.discounts.reduce((sum, d) => sum + (d.amount || 0), 0) : 0);


      order.netTotal = order.netTotal ?? Math.max(0, order.grossTotal - order.discountTotal);

      return order;
    });


    res.render('staff/order', {
      orders: updatedOrders,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error fetching staff orders:', error);


    res.render('staff/order', {
      orders: [],
      user: req.session.user
    });
  }
};



exports.getPendingOrderCount = async (req, res) => {
  try {
    const pendingOrderCount = await Order.countDocuments({ status: 'pending' });
    const pendingReservationCount = await Reservation.countDocuments({ status: 'pending' });
    const totalPending = pendingOrderCount + pendingReservationCount;

    res.json({ pendingCount: totalPending });
  } catch (err) {
    console.error('Error fetching pending orders/reservations count:', err);
    res.status(500).json({ pendingCount: 0 });
  }
};


exports.getPendingOrders = async (req, res) => {
  try {

    const pendingOrders = await Order.find({ status: 'pending' })
      .populate('userId', 'firstName lastName') 
      .sort({ createdAt: -1 })
      .lean();

    const pendingReservations = await Reservation.find({ status: 'pending' })
      .select('fullName createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ pendingOrders, pendingReservations });
  } catch (err) {
    console.error('Error fetching pending orders/reservations:', err);
    res.status(500).json({ pendingOrders: [], pendingReservations: [] });
  }
};





exports.getOrdersDone = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'completed' })
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'image name')
      .sort({ createdAt: -1 })
      .lean();

    const updatedOrders = orders.map(order => {
      order.grossTotal = order.grossTotal ?? order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      order.discountTotal = order.discountTotal ?? (order.discounts ? order.discounts.reduce((sum, d) => sum + (d.amount || 0), 0) : 0);
      order.netTotal = order.netTotal ?? Math.max(0, order.grossTotal - order.discountTotal);
      return order;
    });

    res.render('staff/order_done', {
      orders: updatedOrders,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error fetching completed staff orders:', error);
    res.render('staff/order_done', {
      orders: [],
      user: req.session.user
    });
  }
};
exports.downloadReceiptPDF = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('items.productId', 'name')
      .lean();

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Get settings for logo
    const settings = await Settings.findOne().lean();

    // Resolve logo path (absolute)
    let logoPath;
    if (settings && settings.logo) {
      logoPath = path.join(__dirname, '../public', settings.logo);
    } else {
      logoPath = path.join(__dirname, '../public/images/napslogo.png');
    }

    // ✅ POS-style receipt
    const doc = new PDFDocument({
      size: [226, 600],
      margins: { top: 10, left: 10, right: 10, bottom: 10 }
    });

    // ✅ Use built-in Helvetica (no .ttf needed, peso sign supported)
    doc.font('Helvetica');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt-${order._id}.pdf`
    );
    doc.pipe(res);

    // --- LOGO ---
    if (fs.existsSync(logoPath)) {
      const logoWidth = 70;
      const pageWidth = doc.page.width;
      const x = (pageWidth - logoWidth) / 2;

      doc.image(logoPath, x, 10, { width: logoWidth });
      doc.moveDown(6);
    } else {
      doc.moveDown(2);
    }

    // --- STORE INFO ---
    doc.fontSize(12).text("Nap's Grill and Restobar", { align: 'center' });
    doc.fontSize(8).text(
      '32nd Street corner Melencio St.,\nKapitan Pepe Phase II Subd.,\nCabanatuan City, Philippines',
      { align: 'center' }
    );
    doc.text('Tel: 0994 705 8003', { align: 'center' });
    doc.moveDown();
    doc.fontSize(8).text('================================', { align: 'center' });

    // --- ORDER INFO ---
doc.fontSize(9).text(`Order #: ${order._id}`);

// Convert order.createdAt to Philippine Time (UTC+8)
const manilaTime = new Date(order.createdAt).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

doc.text(`Date: ${manilaTime}`);

doc.text(
  `Customer: ${
    order.userId
      ? `${order.userId.firstName} ${order.userId.lastName}`
      : order.fullName || 'Guest'
  }`
);

doc.moveDown();
doc.fontSize(8).text('--------------------------------', { align: 'center' });

    // --- ITEMS ---
    order.items.forEach((item) => {
      doc.fontSize(9).text(`${item.name}`);
      doc.text(
        `${item.quantity} x ₱${item.price.toFixed(2)}   ₱${item.subtotal.toFixed(2)}`,
        { align: 'right' }
      );
    });

    doc.fontSize(8).text('--------------------------------', { align: 'center' });

    // --- DISCOUNTS ---
    if (order.discounts && order.discounts.length > 0) {
      doc.fontSize(9).text('Discounts:', { underline: true });
      order.discounts.forEach((d) => {
        doc.text(`${d.description || d.type}: - ₱${d.amount.toFixed(2)}`);
      });
      doc.moveDown();
    }

    // --- TOTALS ---
    doc.fontSize(10).text(`Gross Total: ₱${order.grossTotal.toFixed(2)}`, {
      align: 'right'
    });
    doc.text(`Discount: - ₱${order.discountTotal.toFixed(2)}`, {
      align: 'right'
    });
    doc.fontSize(11).text(`Net Total: ₱${order.netTotal.toFixed(2)}`, {
      align: 'right'
    });
    doc.moveDown();

    // --- PAYMENT ---
    if (order.payment) {
      doc.fontSize(9).text(`Payment: ${order.payment.method || 'Gcash'}`);
      if (order.payment.referenceNumber) {
        doc.text(`Ref No: ${order.payment.referenceNumber}`);
      }
      doc.moveDown();
    }

    doc.fontSize(8).text('================================', { align: 'center' });
// --- FOOTER ---
doc.fontSize(9).text('Thank you for dining with us!', { align: 'center' });
doc.fontSize(8).text("Visit again at Nap's Grill and Restobar", {
  align: 'center'
});

doc.moveDown(2); // adds a little spacing
doc.fontSize(10).text(
  "This is not an official receipt and not a valid source of claiming input VAT. Please request the official invoice from the merchant.",
  { align: 'center' }
);


    doc.end();
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    res.status(500).send('Error generating receipt');
  }
};




exports.getReservations = async (req, res) => {
  try {
   const reservations = await Reservation.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .populate('tableId', 'name price')
      .sort({ createdAt: -1 })
      .lean();

    res.render('staff/reservation', {
      reservations,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.render('staff/reservation', {
      reservations: [],
      user: req.session.user
    });
  }
};

exports.approveReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('tableId').lean();

    if (!reservation) return res.status(404).send('Reservation not found');

    await Reservation.findByIdAndUpdate(req.params.id, {
      status: 'confirmed',
      completedAt: new Date()
    });

    await sendReservationConfirmedEmail({
      to: reservation.email,
      name: reservation.fullName,
      tableName: reservation.tableId.name,
      dineInDateTime: reservation.dineInDateTime
    });

    res.status(200).json({ message: 'Reservation approved and email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.rejectReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('tableId').lean();

    if (!reservation) return res.status(404).send('Reservation not found');

    await Reservation.findByIdAndUpdate(req.params.id, { status: 'cancelled' });

    await sendRejectionEmail({
      to: reservation.email,
      name: reservation.fullName,
      tableName: reservation.tableId?.name || 'a table'
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Error rejecting reservation:', err);
    res.sendStatus(500);
  }
};

exports.processOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('userId').lean();

    if (!order) return res.status(404).json({ message: 'Order not found' });

    await Order.findByIdAndUpdate(orderId, {
      status: 'processing',
      updatedAt: new Date()
    });

    await sendOrderProcessedEmail({
      to: order.userId.email,
      name: `${order.userId.firstName} ${order.userId.lastName}`,
      orderId: order._id
    });

    res.status(200).json({ message: 'Order status updated to processing and email sent' });

  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('userId');

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/staff/order');
    }

    order.status = 'rejected';
    await order.save();

    await sendOrderRejectedEmail({
      to: order.userId.email,
      name: `${order.userId.firstName} ${order.userId.lastName}`,
      orderId: order._id
    });

    req.flash('success', `Order #${order._id} rejected and email sent to customer.`);
    res.redirect('/staff/order');
  } catch (err) {
    console.error('[Order Rejection Error]:', err);
    req.flash('error', 'Something went wrong while rejecting the order.');
    res.redirect('/staff/order');
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('userId');

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/staff/order');
    }

    order.status = 'completed';
    order.updatedAt = new Date();
    await order.save();

    // Send email to user
    await sendOrderCompletedEmail({
      to: order.userId.email,
      name: `${order.userId.firstName} ${order.userId.lastName}`,
      orderId: order._id
    });

    req.flash('success', `Order #${order._id} marked as completed and email sent to customer.`);
    res.redirect('/staff/order');
  } catch (error) {
    console.error('[Order Completion Error]:', error);
    req.flash('error', 'Something went wrong while completing the order.');
    res.redirect('/staff/order');
  }
};
exports.readyToPickupOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('userId');

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/staff/order');
    }

    order.status = 'ready_to_pickup';
    order.updatedAt = new Date();
    await order.save();

    await sendReadyToPickupEmail({
      to: order.userId.email,
      name: `${order.userId.firstName} ${order.userId.lastName}`,
      orderId: order._id
    });

    req.flash('success', `Order #${order._id} marked as ready for pickup.`);
    res.redirect('/staff/order');
  } catch (error) {
    console.error('[Ready to Pickup Error]:', error);
    req.flash('error', 'Something went wrong while updating the order.');
    res.redirect('/staff/order');
  }
};


// ✅ Render calendar page
exports.renderCalendarPage = async (req, res) => {
  try {
    res.render('staff/calendar', {
      user: req.session.user
    });
  } catch (err) {
    console.error('Error rendering calendar:', err);
    res.render('staff/calendar', { user: req.session.user });
  }
};

exports.getCalendarEvents = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('tableId', 'name')
      .populate('userId', 'firstname lastname email mobile') // populate user info if needed
      .lean();

    const events = reservations.map(r => ({
      id: r._id,
      title: `Reservation - ${r.tableId?.name || 'Table'} (${r.fullName})`,
      start: r.dineInDateTime,
      color: r.status === 'confirmed' ? '#28a745' : '#ffc107',
      extendedProps: {  // ✅ additional info for modal
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        table: r.tableId?.name,
        refNo: r.referenceNumber,
        price: r.totalPrice,
        fee: r.reservation_fee,
        status: r.status,
        proof: r.proofOfPayment
      }
    }));

    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};
exports.getAllChats = async (req, res) => {
    try {
        const chats = await CustomerSupport.find().sort({ 'messages.createdAt': 1 }).lean(); // use .lean() to get plain objects
        res.render('staff/chat', { 
            chats,
            user: req.session.user, // use session user
        });
    } catch (err) {
        console.error(err);
        res.send('Error fetching chats');
    }
};

// Staff sends a message to existing chat
exports.sendMessage = async (req, res) => {
  const { userId, message } = req.body;

  try {
    if (!req.session.user || !req.session.user.email) {
      console.error('[Send Staff Message Error]: Staff session not found.');
      req.flash('error', 'Staff not logged in.');
      return res.redirect('/staff/chat');
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('[Send Staff Message Error]: User not found for ID', userId);
      req.flash('error', 'User not found.');
      return res.redirect('/staff/chat');
    }

    let chat = await CustomerSupport.findOne({ userId: user._id });
    if (!chat) {
      chat = new CustomerSupport({
        userId: user._id,
        userEmail: user.email, // ✅ Save user email here
        messages: []
      });
    }

    chat.messages.push({
  sender: 'staff',
  email: req.session.user.email,
  message: message || null,
  image: req.file ? `/uploads/${req.file.filename}` : null  // ✅ save uploaded image path
});


    await chat.save();
    res.redirect('/staff/chat');
  } catch (err) {
    console.error('[Send Staff Message Error]:', err);
    res.redirect('/staff/chat');
  }
};


// Staff starts a new chat
exports.addChat = async (req, res) => {
  try {
    const { email, message } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    // ✅ Check if chat already exists
    let existingChat = await CustomerSupport.findOne({ userId: user._id });
    if (existingChat) {
      return res.json({
        success: false,
        reminder: true,
        message: `A chat with (${user.email}) already exists.`,
        chatId: existingChat._id
      });
    }

    // If not exist, create new chat
    const newChat = await CustomerSupport.create({
      userId: user._id,
      userEmail: user.email, // ✅ Save user email here
      messages: [
        {
          sender: 'staff',
          email: req.session.user.email, // staff email only
          message
        }
      ]
    });

    res.json({
      success: true,
      chatId: newChat._id,
      name: `${user.firstname} ${user.lastname}`,
      email: user.email
    });
  } catch (err) {
    console.error('[Add Chat Error]:', err);
    res.json({ success: true, message: 'add chat' });
  }
};




exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    await CustomerSupport.findByIdAndDelete(chatId);
    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error deleting chat' });
  }
};
