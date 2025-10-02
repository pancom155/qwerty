const express = require('express');
const path    = require('path');
const multer  = require('multer');
const router  = express.Router();
const loadSettings = require('../middleware/loadSettings');
const adminController = require('../controllers/adminController');
const { getAdminIndex } = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { toggleProductStatus } = require('../controllers/adminController');
const authController = require('../controllers/authController');

const upload = multer({ dest: 'public/uploads/' });
router.use(loadSettings);
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/index', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/reservation', adminController.getReservationPage);

router.get('/settings', adminController.getSettings);


router.get('/calendar', adminController.renderCalendarPage);

router.get('/calendar/events', adminController.getCalendarEvents);

router.post('/settings/upload-order-qr', upload.single('orderQR'), adminController.uploadOrderQR);
router.post('/admin/upload-logo', upload.single('logo'), adminController.uploadLogo);

router.post('/settings/upload-logo', upload.single('logo'), adminController.uploadLogo);

router.post('/reviews/:id/delete', adminController.deleteReview);

router.get('/reviews',adminController.getReviews);
router.get('/orders', adminController.getOrdersPage);

router.get('/order_rejected', adminController.getOrders_rejected);
router.get('/order_pending', adminController.getOrders_pending);

router.get('/admin', getAdminIndex);
router.get ('/products', adminController.getProducts);

router.post('/products/add', upload.single('image'), adminController.addProduct);
router.post('/products/edit/:id', upload.single('image'), adminController.editProduct);
router.post('/products/delete/:id', adminController.deleteProduct);
router.post('/products/status/:id', toggleProductStatus);
router.post('/settings/upload-reservation-qr', upload.single('reservationQR'), adminController.uploadReservationQR);
router.post('/reservation/:id/status', adminController.updateReservationStatus);
router.get ('/reservations', adminController.getReservations);
router.get ('/reservation_done', adminController.getReservation_done);
router.get ('/reservation_cancelled', adminController.getReservation_cancelled);

router.post('/users/:id/block', adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);

router.get ('/staff', adminController.getStaff);
router.post('/staff/create', adminController.createAccount);
router.post('/staff/:id/edit', adminController.editAccount);
router.post('/staff/:id/delete', adminController.deleteAccount);

router.get ('/table', adminController.getTable);
router.post('/table/create', upload.single('image'), adminController.createTable);
router.post('/table/edit/:id', upload.single('image'), adminController.editTable);
router.post('/table/delete/:id', adminController.deleteTable);

router.get ('/discounts', adminController.getDiscountPage);

router.post('/vouchers/create', upload.single('image'), adminController.createVoucher);
router.post('/vouchers/:id/edit', upload.single('image'), adminController.updateVoucher);
router.post('/vouchers/:id/delete', adminController.deleteVoucher);

module.exports = router;
