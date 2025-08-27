const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const loginRateLimiter = require('../middleware/loginRateLimiter');

router.get('/', authController.getIndexPage);
router.get('/login', authController.getLogin);
router.post('/login', loginRateLimiter, authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-forgot-otp', authController.verifyForgotOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);


router.get('/admin/index', authMiddleware, adminMiddleware, authController.getAdminIndex);
router.get('/unauthorized', (req, res) => {
  res.render('unauthorized');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
