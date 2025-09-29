const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const Settings = require('./models/Settings');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const staffRoutes = require('./routes/staffRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const kitchenStaffRoutes = require('./routes/kitchenStaffRoutes');
const loadSettings = require('./middleware/loadSettings');

const http = require('http');
const { Server } = require("socket.io");

// --- CREATE SERVER AFTER app IS DEFINED ---
const server = http.createServer(app);
const io = new Server(server);

// --- MIDDLEWARES ---
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(loadSettings); 
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.set("io", io);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.editSuccess = req.flash('editSuccess');
  res.locals.error = req.flash('error');
  next();
});

// --- ROUTES ---
app.use('/', authRoutes);
app.use('/cart', cartRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);
app.use('/waiter', waiterRoutes);
app.use('/kitchen', kitchenStaffRoutes);
app.use("/", reportRoutes);

// --- MAKE io ACCESSIBLE IN REQ OBJECT ---
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- SOCKET.IO CONNECTION ---
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
  });
});

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = { io, server };
