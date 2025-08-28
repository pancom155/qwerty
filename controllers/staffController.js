const Reservation = require('../models/Reservation');
const Order = require('../models/Order');
const { sendReservationConfirmedEmail, sendRejectionEmail, sendOrderProcessedEmail, sendOrderRejectedEmail, sendOrderCompletedEmail, sendReadyToPickupEmail } = require('../middleware/emailService');

exports.renderStaffDashboard = async (req, res) => {
  try {
    const [orders, reservations] = await Promise.all([
      Order.find().lean(),
      Reservation.find().lean()
    ]);

    res.render('staff/index', {
      user: req.session.user,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      processingOrders: orders.filter(o => o.status === 'processing').length,
      readyToPickupOrders: orders.filter(o => o.status === 'ready_to_pickup').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,

      totalReservations: reservations.length,
      pendingReservations: reservations.filter(r => r.status === 'pending').length,
      confirmedReservations: reservations.filter(r => r.status === 'confirmed').length
    });

  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.render('staff/index', {
      user: req.session.user,
      readyToPickupOrders: 0,
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
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
