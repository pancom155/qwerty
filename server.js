const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
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
const app = express();

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

app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.editSuccess = req.flash('editSuccess');
  res.locals.error = req.flash('error');
  next();
});


app.use('/', authRoutes);
app.use('/cart', cartRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);
app.use('/waiter', waiterRoutes);
app.use('/kitchen', kitchenStaffRoutes);
app.use("/", reportRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
