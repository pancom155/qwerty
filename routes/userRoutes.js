const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer'); 
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Add these new routes
router.get('/myreservation', isLoggedIn, userController.renderMyReservationsPage);
router.post('/reservation/cancel/:id', isLoggedIn, userController.cancelReservation);

router.get('/menu', userController.menuPage);
router.get('/reservation', isLoggedIn, userController.renderReservationPage);
router.get('/orders', isLoggedIn, userController.renderOrdersPage);

router.get('/customer_support', isLoggedIn, userController.renderCustomerSupport);
router.post( '/customer_support/send',isLoggedIn,upload.single('image'), userController.sendMessage);
router.get('/customer_support/messages', userController.getMessages);





router.get('/table/:id', isLoggedIn, userController.viewTableDetails);
router.post('/reservation/:id/book', isLoggedIn, upload.single('proofOfPayment'), userController.bookTable);

router.get('/voucher', isLoggedIn, userController.renderVoucherPage);
router.post('/voucher/:id/claim', isLoggedIn, userController.claimVoucher);

router.get('/pwd', isLoggedIn, userController.renderPWDPage);
router.post('/pwd/apply', isLoggedIn, upload.single('document'), userController.submitPWDRequest);

router.get('/placeorder', isLoggedIn, userController.renderCheckoutPage);
router.post('/placeorder', isLoggedIn, upload.single('proofOfPayment'), userController.placeOrder);

router.get('/order-success/:orderId', userController.renderOrderSuccess);

router.get('/reviews', isLoggedIn, userController.getReviewsPage);
router.post('/reviews/:orderId', isLoggedIn, userController.submitReview);


// Profile routes
router.get('/profile', isLoggedIn, userController.renderProfilePage);
router.get('/edit-profile', isLoggedIn, userController.renderEditProfilePage);
router.post('/edit-profile', isLoggedIn, upload.single('profileImage'), userController.updateProfile);

module.exports = router;