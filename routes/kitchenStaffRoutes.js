const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenStaffController');

router.get('/index', kitchenController.getKitchenDashboard);


module.exports = router;
