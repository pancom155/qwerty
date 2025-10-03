const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const serverless = require('serverless-http');

const loadSettings = require('./middleware/loadSettings');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const staffRoutes = require('./routes/staffRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const kitchenStaffRoutes = require('./routes/kitchenStaffRoutes');

const app = express();

// Middleware
app.set("trust proxy", 1);
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

// Routes
app.use('/', authRoutes);
app.use('/cart', cartRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);
app.use('/waiter', waiterRoutes);
app.use('/kitchen', kitchenStaffRoutes);
app.use('/', reportRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// 👉 Export handler for Vercel
module.exports = serverless(app);
