const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// Block a date
router.post('/block-date', calendarController.blockDate);

// Unblock a date
router.delete('/unblock-date', calendarController.unblockDate);

// Get blocked dates
router.get('/blocked-dates', calendarController.getBlockedDates);

module.exports = router;
