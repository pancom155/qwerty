const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');

// Route for dashboard
router.get('/index', waiterController.getWaiterDashboard);
router.get('/products', waiterController.getAllProducts);
// ✅ Route for category-based products
router.get('/products/:category', waiterController.getProductsByCategory);
router.post('/submit', waiterController.placeOrder);

module.exports = router;
