const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// Get current status
router.get('/', statusController.getStatus);

// Toggle restaurant open/close
router.post('/toggle', statusController.toggleStatus);

module.exports = router;
