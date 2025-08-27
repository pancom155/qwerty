const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

function checkStaffAuth(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'staff') {
    return res.redirect('/login');
  }
  next();
}

router.get('/index', checkStaffAuth, staffController.renderStaffDashboard);
router.get('/order', checkStaffAuth, staffController.getOrders);
router.get('/reservation', checkStaffAuth, staffController.getReservations);
router.post('/reservation/:id/approve', checkStaffAuth, staffController.approveReservation);
router.post('/reservation/:id/reject', checkStaffAuth, staffController.rejectReservation);
router.post('/orders/process/:id', checkStaffAuth, staffController.processOrder);
router.post('/orders/reject/:id', checkStaffAuth, staffController.rejectOrder);
router.post('/orders/complete/:id', staffController.completeOrder);
router.post('/orders/ready/:id', checkStaffAuth, staffController.readyToPickupOrder);

module.exports = router;
