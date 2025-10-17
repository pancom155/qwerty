const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

const upload = require('../middleware/upload');
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

router.get('/pending-count', staffController.getPendingOrderCount);
router.get('/pending-orders', staffController.getPendingOrders);

router.get('/order_done', checkStaffAuth, staffController.getOrdersDone);
router.get('/orders/receipt/:id', checkStaffAuth, staffController.downloadReceiptPDF);


router.get('/calendar', checkStaffAuth, staffController.renderCalendarPage);

router.get('/calendar/events', staffController.getCalendarEvents);



router.put('/update-item/:itemId', staffController.updateOrderItem);





// Staff chat with users
router.post('/chat/add', staffController.addChat);
router.delete('/chat/:chatId', staffController.deleteChat);
router.get('/chat', checkStaffAuth, staffController.getAllChats);
router.post('/chat/send', upload.single('image'), staffController.sendMessage);
router.get('/chat/messages', staffController.getMessages);

module.exports = router;
