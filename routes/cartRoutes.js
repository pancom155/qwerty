const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.post('/add', cartController.addToCart);
router.post('/remove', cartController.removeFromCart);
router.get('/count', cartController.getCartCount);
router.get('/items', cartController.getCartItems);
router.post('/increase', cartController.increaseQuantity);
router.post('/decrease', cartController.decreaseQuantity);

router.post('/test', (req, res) => {
  console.log('[TEST ROUTE] POST /cart/test');
  console.log('Body:', req.body);
  res.send('Test received');
});

module.exports = router;
