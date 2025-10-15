const bcrypt = require('bcrypt');
const User = require('../models/User');
const Staff = require('../models/Staff');
const KitchenStaff = require('../models/KitchenStaff');
const Waiter = require('../models/Waiter');
const Voucher = require('../models/Voucher');
const Review = require('../models/Review');
const Product = require('../models/Product'); 
const Table = require('../models/Table');
const Order = require('../models/Order');

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { Parser } = require("json2csv");
const path = require('path');
const Reservation = require('../models/Reservation');
const moment = require('moment');
const { generateOtp, sendOtpEmail } = require('../middleware/emailService');

exports.getIndexPage = async (req, res) => {
  try {
    // ✅ Get latest 6 reviews with user and order details
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate({
        path: 'userId',
        select: 'firstname lastname email' // adjust according to User schema
      })
      .populate({
        path: 'orderId',
        populate: {
          path: 'items.productId',
          model: 'Product',
          select: 'name image'
        }
      });

    // ✅ Get all products
    const products = await Product.find();

    // ✅ Get all tables
    const tables = await Table.find();

    // ✅ Render index page with all data
    res.render('index', {
      reviews,
      products,
      tables, // now available in EJS
      user: req.session.user || null
    });
  } catch (err) {
    console.error('Error loading index page:', err.message);
    res.status(500).send('Internal Server Error');
  }
};


exports.getLogin = (req, res) => {
  const success = req.query.registered === '1';
  res.render('login', { error: null, success });
};

exports.getRegister = (req, res) => {
  res.render('register', { error: null, showOTP: false, email: null });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  // Admin login
  if (email === 'napsgrillrestobar08@gmail.com' && password === '12345678') {
    req.session.user = { 
      _id: 'admin',     
      email, 
      role: 'admin' 
    };
    return req.session.save(err => {
      if (err) return res.render('login', { error: 'Session error.', cooldownSeconds: null, success: false });
      return res.redirect('/admin/index');
    });
  }

  // Email domain checks
  const domain = email.split('@')[1];
  if (email.includes('staff') && domain !== 'staff.com') {
    return res.render('login', {
      error: 'Staff email must end with @staff.com.',
      cooldownSeconds: null,
      success: false
    });
  }
  if (email.includes('waiter') && domain !== 'waiter.com') {
    return res.render('login', {
      error: 'Waiter email must end with @waiter.com.',
      cooldownSeconds: null,
      success: false
    });
  }
  if (email.includes('kitchen') && domain !== 'kitchen.com') {
    return res.render('login', {
      error: 'Kitchen staff email must end with @kitchen.com.',
      cooldownSeconds: null,
      success: false
    });
  }

  // ===== FIXED LOGIN ATTEMPT TRACKING =====
  if (!req.session.loginAttempts) req.session.loginAttempts = {};
  const loginAttempts = req.session.loginAttempts;
  const now = new Date();

  // Ensure record exists
  if (!loginAttempts[email]) {
    loginAttempts[email] = { count: 0, lastAttempt: null, lockUntil: null };
  }

  const userAttempt = loginAttempts[email];
  const cooldown = 2 * 60 * 1000; // 2 minutes cooldown

  // Check if currently locked
  if (userAttempt.lockUntil && now < userAttempt.lockUntil) {
    const secondsLeft = Math.floor((userAttempt.lockUntil - now) / 1000);
    return res.render('login', {
      error: `Too many failed login attempts. Please wait ${Math.floor(secondsLeft / 60)} minutes and ${secondsLeft % 60} seconds.`,
      cooldownSeconds: secondsLeft,
      success: false
    });
  }

  // Find account in appropriate models
  let account = await User.findOne({ email });
  let role = 'user';

  if (!account) {
    account = await Staff.findOne({ email });
    if (account) role = 'staff';
  }

  if (!account) {
    account = await Waiter.findOne({ email });
    if (account) role = 'waiter';
  }

  if (!account) {
    account = await KitchenStaff.findOne({ email });
    if (account) role = 'kitchen';
  }

  // Wrong email
  if (!account) {
    userAttempt.count++;
    userAttempt.lastAttempt = now;

    if (userAttempt.count >= 3) {
      userAttempt.lockUntil = new Date(now.getTime() + cooldown);
      const secondsLeft = Math.floor(cooldown / 1000);
      return res.render('login', {
        error: `Too many failed login attempts. Please wait ${Math.floor(secondsLeft / 60)} minutes and ${secondsLeft % 60} seconds.`,
        cooldownSeconds: secondsLeft,
        success: false
      });
    }

    const attemptsLeft = Math.max(0, 3 - userAttempt.count);
    return res.render('login', {
      error: `Wrong email. ${attemptsLeft} attempt(s) left.`,
      cooldownSeconds: null,
      success: false
    });
  }

  // Email verified check
  if (!account.isVerified) return res.redirect('/unauthorized');

  // Password check
  const isMatch = await bcrypt.compare(password, account.password);
  if (!isMatch) {
    userAttempt.count++;
    userAttempt.lastAttempt = now;

    if (userAttempt.count >= 3) {
      userAttempt.lockUntil = new Date(now.getTime() + cooldown);
      const secondsLeft = Math.floor(cooldown / 1000);
      return res.render('login', {
        error: `Too many failed login attempts. Please wait ${Math.floor(secondsLeft / 60)} minutes and ${secondsLeft % 60} seconds.`,
        cooldownSeconds: secondsLeft,
        success: false
      });
    }

    const attemptsLeft = Math.max(0, 3 - userAttempt.count);
    return res.render('login', {
      error: `Wrong password. ${attemptsLeft} attempt(s) left.`,
      cooldownSeconds: null,
      success: false
    });
  }

  // Reset login attempts on success
  loginAttempts[email] = { count: 0, lastAttempt: null, lockUntil: null };

  // Save session
  req.session.user = {
    _id: account._id,   
    email: account.email,
    fullName: account.fullName,
    role: role
  };

  req.session.save(err => {
    if (err) {
      return res.render('login', {
        error: 'Session error. Try again.',
        cooldownSeconds: null,
        success: false
      });
    }

    // Redirect based on role
    if (role === 'admin') return res.redirect('/admin/index');
    if (role === 'staff') return res.redirect('/staff/index');
    if (role === 'waiter') return res.redirect('/waiter/index');
    if (role === 'kitchen') return res.redirect('/kitchen/index');
    return res.redirect('/user/menu');
  });
};


exports.postRegister = async (req, res) => {
  try {
    const { firstName, lastName, address, contactNo, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render('register', { error: 'Passwords do not match.', showOTP: false, email: null });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'Email already exists.', showOTP: false, email: null });
    }

    const otp = generateOtp();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    req.session.pendingUser = {
      firstName,
      lastName,
      address,
      contactNo,
      email,
      password, 
      otp,
      otpExpires
    };

    await sendOtpEmail(email, otp);

    return res.render('register', {
      showOTP: true,
      email,
      error: null
    });

  } catch (err) {
    console.error(err);
    return res.render('register', { error: 'Registration failed. Try again.', showOTP: false, email: null });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const pendingUser = req.session.pendingUser;

  if (!pendingUser || pendingUser.email !== email) {
    return res.json({ success: false, message: 'Session expired. Please register again.' });
  }

  if (pendingUser.otp !== otp || pendingUser.otpExpires < Date.now()) {
    return res.json({ success: false, message: 'Invalid or expired OTP.' });
  }

  const hashedPassword = await bcrypt.hash(pendingUser.password, 10);

  const newUser = new User({
    firstName: pendingUser.firstName,
    lastName: pendingUser.lastName,
    address: pendingUser.address,
    contactNo: pendingUser.contactNo,
    email: pendingUser.email,
    password: hashedPassword,
    isVerified: true,
    otp: null,
    otpExpires: null
  });

  await newUser.save();
  req.session.pendingUser = null;

  return res.json({ success: true });
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
      return res.json({ success: false, message: 'Session expired. Please register again.' });
    }

    const newOtp = generateOtp();
    const otpExpires = Date.now() + 5 * 60 * 1000;

    req.session.pendingUser.otp = newOtp;
    req.session.pendingUser.otpExpires = otpExpires;

    await sendOtpEmail(email, newOtp);

    res.json({ success: true });
  } catch (err) {
    console.error('Error resending OTP:', err);
    res.json({ success: false, message: 'Failed to resend OTP. Please try again.' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.json({ success: false, message: 'Email not found.' });

  const otp = generateOtp();
  const otpExpires = Date.now() + 5 * 60 * 1000;

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  await sendOtpEmail(email, otp, 'reset');
  res.json({ success: true });
};

exports.verifyForgotOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.json({ success: false, message: 'Invalid or expired OTP.' });
  }

  user.otp = null;
  user.otpExpires = null;
  await user.save();

  res.json({ success: true });
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: 'User not found.' });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ success: true });
};

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId).lean();
    if (!user) return res.redirect('/login');

    const vouchers = await Voucher.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
      expiryDate: { $gte: new Date() },
      redeemedBy: { $ne: userId }
    }).sort({ createdAt: -1 }).lean();

    const pendingOrders = await Order.find({ userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.productId')
      .lean();

    const processingOrders = await Order.find({ userId, status: 'processing' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.productId')
      .lean();

    const completedOrders = await Order.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.productId')
      .lean();

    const rejectedOrders = await Order.find({ userId, status: 'rejected' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.productId')
      .lean();

    const cancelledOrders = await Order.find({ userId, status: 'cancelled' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.productId')
      .lean();

    const pendingReservations = await Reservation.find({
      userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(5).lean();

    const completedReservations = await Reservation.find({
      userId,
      status: 'confirmed'
    }).sort({ createdAt: -1 }).limit(5).lean();

    res.render('user/menu', {
      user,
      availableVouchers: vouchers,
      pendingOrders,
      processingOrders,
      completedOrders,
      rejectedOrders,
      cancelledOrders,
      pendingReservations,
      completedReservations,
      moment
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).send('Server Error');
  }
  
};
exports.getAdminIndex = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // ✅ Start and End of current month
    const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // ✅ Monthly-based counts
    const [
      pendingOrders, processingOrders, readyToPickupOrders,
      completedOrders, rejectedOrders, cancelledOrders,
      totalProducts, totalUsers, totalTables,
      pendingReservations, confirmedReservations, cancelledReservations,
      doneReservations, totalOrders, totalReviews
    ] = await Promise.all([
      Order.countDocuments({ status: 'pending', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ status: 'processing', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ status: 'ready', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ status: 'completed', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ status: 'rejected', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ status: 'cancelled', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Product.countDocuments(), // products are lifetime, not monthly
      User.countDocuments(),    // users are lifetime, not monthly
      Table.countDocuments(),   // tables are lifetime, not monthly
      Reservation.countDocuments({ status: 'pending', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Reservation.countDocuments({ status: 'confirmed', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Reservation.countDocuments({ status: 'cancelled', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Reservation.countDocuments({ status: 'done', createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Order.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
      Review.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } })
    ]);

    /** ----------------
     * Your existing sales analytics (monthly, daily, weekly, yearly)
     * ---------------- */
    const monthlySalesArray = [];
    for (let month = 0; month < 12; month++) {
      const start = new Date(currentYear, month, 1, 0, 0, 0);
      const end = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

      const monthlyOrders = await Order.find({
        status: 'completed',
        createdAt: { $gte: start, $lte: end }
      });

      const totalSales = monthlyOrders.reduce((sum, order) => sum + order.netTotal, 0);
      monthlySalesArray.push(totalSales);
    }

    const currentMonthSales = monthlySalesArray[currentMonth];
    const lastMonthSales = currentMonth > 0 ? monthlySalesArray[currentMonth - 1] : 0;
    const monthlySalesDiff = currentMonthSales - lastMonthSales;

    // ✅ Daily Sales (current month)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailySalesArray = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const start = new Date(currentYear, currentMonth, day, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, day, 23, 59, 59, 999);

      const dailyOrders = await Order.find({
        status: 'completed',
        createdAt: { $gte: start, $lte: end }
      });

      const totalSales = dailyOrders.reduce((sum, order) => sum + order.netTotal, 0);
      dailySalesArray.push(totalSales);
    }

    // ✅ Weekly Sales (current month)
    const weeklySalesArray = [];
    let weekStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
    while (weekStart.getMonth() === currentMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd.getMonth() !== currentMonth) {
        weekEnd.setDate(new Date(currentYear, currentMonth + 1, 0).getDate());
      }
      weekEnd.setHours(23, 59, 59, 999);

      const weeklyOrders = await Order.find({
        status: 'completed',
        createdAt: { $gte: weekStart, $lte: weekEnd }
      });

      const totalSales = weeklyOrders.reduce((sum, order) => sum + order.netTotal, 0);
      weeklySalesArray.push(totalSales);

      weekStart.setDate(weekStart.getDate() + 7);
    }

    // ✅ Yearly Sales (last 5 years)
    const yearlySalesArray = [];
    for (let year = currentYear - 4; year <= currentYear; year++) {
      const start = new Date(year, 0, 1, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);

      const yearlyOrders = await Order.find({
        status: 'completed',
        createdAt: { $gte: start, $lte: end }
      });

      const totalSales = yearlyOrders.reduce((sum, order) => sum + order.netTotal, 0);
      yearlySalesArray.push(totalSales);
    }

    // ✅ Recent Orders & Reviews
    const recentOrders = await Order.find({ createdAt: { $gte: monthStart, $lte: monthEnd } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('userId');

    const recentReviews = await Review.find({ createdAt: { $gte: monthStart, $lte: monthEnd } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate({
        path: 'orderId',
        populate: [
          { path: 'userId', select: 'firstName lastName' },
          { path: 'items.productId', model: 'Product', select: 'name image' }
        ]
      })
      .lean();

    res.render('admin/index', {
      totalOrders,
      completedOrders,
      pendingOrders,
      processingOrders,
      readyToPickupOrders,
      rejectedOrders,
      cancelledOrders,
      totalProducts,
      totalUsers,
      totalTables,
      totalReviews,
      pendingReservations,
      confirmedReservations,
      cancelledReservations,
      doneReservations,
      monthlySales: currentMonthSales,
      monthlySalesDiff,
      monthlySalesArray,
      dailySalesArray,
      weeklySalesArray,
      yearlySalesArray,
      recentOrders,
      recentReviews
    });
  } catch (err) {
    console.error("❌ Controller error:", err);
    res.status(500).send('Server error');
  }
};


// 🛠 Helper function para i-validate dates
function parseDateRange(from, to) {
  if (!from || !to) return { error: "Please provide both 'from' and 'to' dates." };

  const fromDate = new Date(from);
  const toDate = new Date(to + "T23:59:59");

  if (isNaN(fromDate) || isNaN(toDate)) {
    return { error: "Invalid date format. Use YYYY-MM-DD." };
  }

  return { fromDate, toDate };
}

// ================= PDF EXPORT =================
exports.downloadSalesReportPDF = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, error } = parseDateRange(from, to);

    if (error) return res.status(400).send(error);

    const sales = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      status: "completed",
    }).populate("userId");

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-report-${from}-to-${to}.pdf"`
    );
    doc.pipe(res);

    // ===== HEADER =====
    const logoPath = path.join(__dirname, "../public/images/napslogo.png");
    try {
      const pageWidth = doc.page.width;
      doc.image(logoPath, pageWidth / 2 - 50, 40, { width: 100 });
    } catch {
      console.warn("⚠️ Logo not found, skipping image.");
    }

    doc.moveDown(6);
    doc
      .fontSize(18)
      .text("Nap's Grill and Restubar", { align: "center" })
      .moveDown(0.5)
      .fontSize(10)
      .text("32nd Street corner Melencio St., Kapitan Pepe Phase II Subd.", {
        align: "center",
      })
      .text("Cabanatuan City, Philippines", { align: "center" });

    doc.moveDown(3);

    // ===== REPORT TITLE =====
    doc
      .fontSize(16)
      .text("Sales Report", { align: "center" })
      .moveDown()
      .fontSize(12)
      .text(`Date Range: ${from} to ${to}`, { align: "center" });

    doc.moveDown(2);

    // ===== TABLE HEADER FUNCTION =====
    const drawTableHeader = (yPos) => {
      doc.fontSize(12).text("Customer", 50, yPos);
      doc.text("Date & Time", 250, yPos);
      doc.text("Amount (₱)", 420, yPos);
      doc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).stroke();
    };

    // ===== TABLE BODY =====
    let y = doc.y + 20;
    let total = 0;
    const lineHeight = 20;
    const bottomMargin = 100;

    drawTableHeader(y);
    y += 25;

    if (sales.length === 0) {
      doc.fontSize(12).text("No sales found in this date range.", 50, y);
    } else {
      sales.forEach((order) => {
        // check page overflow
        if (y + lineHeight > doc.page.height - bottomMargin) {
          doc.addPage();
          y = 50;
          drawTableHeader(y);
          y += 25;
        }

        const customerName =
          order.fullName ||
          `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() ||
          "N/A";

        const dateTime = new Date(order.createdAt).toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        doc.fontSize(10).text(customerName, 50, y, { width: 180 });
        doc.text(dateTime, 250, y, { width: 150 });
        doc.text(order.netTotal.toFixed(2), 420, y, {
          width: 100,
          align: "right",
        });

        y += lineHeight;
        total += order.netTotal;
      });

      // ===== TOTAL =====
      if (y + 40 > doc.page.height - bottomMargin) {
        doc.addPage();
        y = 50;
      }

      y += 30;
      doc.fontSize(12).text(`Grand Total Sales: ₱${total.toFixed(2)}`, 50, y, {
        align: "right",
      });
    }

    // ===== SIGNATURE =====
    y += 80;
    if (y + 60 > doc.page.height - 50) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(12).text("Prepared by:", 50, y);
    y += 60;
    doc.fontSize(12).text("__________________________", 50, y);
    doc.fontSize(10).text("napsgrillandrestobar", 70, y + 15);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate report (PDF)");
  }
};


// ================= EXCEL EXPORT =================
exports.downloadSalesReportExcel = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, error } = parseDateRange(from, to);

    if (error) return res.status(400).send(error);

    const sales = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      status: "completed",
    }).populate("userId");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Customer", key: "customer", width: 25 },
      { header: "Date & Time", key: "date", width: 25 },
      { header: "Amount (₱)", key: "amount", width: 15 },
    ];

    let total = 0;
    sales.forEach((order) => {
      const customerName =
        order.fullName ||
        `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() ||
        "N/A";

      sheet.addRow({
        customer: customerName,
        date: new Date(order.createdAt).toLocaleString("en-PH"),
        amount: order.netTotal.toFixed(2),
      });

      total += order.netTotal;
    });

    sheet.addRow([]);
    sheet.addRow({ customer: "Grand Total", amount: `₱${total.toFixed(2)}` });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-report-${from}-to-${to}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate report (Excel)");
  }
};

// ================= CSV EXPORT =================
exports.downloadSalesReportCSV = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { fromDate, toDate, error } = parseDateRange(from, to);

    if (error) return res.status(400).send(error);

    const sales = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      status: "completed",
    }).populate("userId");

    const data = sales.map((order) => ({
      Customer:
        order.fullName ||
        `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() ||
        "N/A",
      Date: new Date(order.createdAt).toLocaleString("en-PH"),
      Amount: order.netTotal.toFixed(2),
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-report-${from}-to-${to}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate report (CSV)");
  }
};