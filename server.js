const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

const Settings = require('./models/Settings');
const CustomerSupport = require('./models/CustomerSupport');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const staffRoutes = require('./routes/staffRoutes');
const statusRoutes = require('./routes/statusRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const kitchenStaffRoutes = require('./routes/kitchenStaffRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const loadSettings = require('./middleware/loadSettings');

const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);

app.set("trust proxy", 1);

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(loadSettings);

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.editSuccess = req.flash('editSuccess');
  res.locals.error = req.flash('error');
  next();
});

app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🧩 URL Protection Middleware
app.use((req, res, next) => {
  const restrictedPrefixes = ["/user", "/admin", "/staff", "/waiter", "/kitchen"];
  const isRestricted = restrictedPrefixes.some(prefix => req.path.startsWith(prefix));

  if (isRestricted && req.method === "GET") {
    const referer = req.get("referer");
    const fromSameSite = referer && referer.startsWith(req.protocol + "://" + req.get("host"));

    // If user directly typed URL or refreshed (no referer)
    if (!fromSameSite) {
      return res.redirect(`/url?blocked=${encodeURIComponent(req.originalUrl)}`);
    }
  }
  next();
});

// --- Routes ---
app.use('/', authRoutes);
app.use('/cart', cartRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);
app.use('/waiter', waiterRoutes);
app.use('/kitchen', kitchenStaffRoutes);
app.use("/", reportRoutes);
app.use('/calendar', calendarRoutes);
app.use('/status', statusRoutes);

// --- Socket.io ---
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// --- Database ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Connection Error:', err));

// --- Unauthorized URL Page ---
app.get('/url', (req, res) => {
  res.render('url', {
    requestedUrl: req.query.blocked || req.originalUrl,
    clientIp: req.ip
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
  console.log(`Server running → http://localhost:${PORT}`);
});

module.exports = { io, server };
