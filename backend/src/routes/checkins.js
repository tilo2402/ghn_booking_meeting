const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// POST /api/checkins/:bookingId - Check in to a booking
router.post('/:bookingId', authMiddleware, async (req, res) => {
  // Body: { method: 'qr_code' | 'nfc' | 'tablet' | 'mobile_app', device_id? }
  res.status(501).json({
    error: {
      status: 501,
      message: 'Check-in endpoint not fully implemented yet'
    }
  });
});

// GET /api/checkins/status/:bookingId - Get check-in status
router.get('/status/:bookingId', authMiddleware, async (req, res) => {
  res.status(501).json({
    error: {
      status: 501,
      message: 'Get check-in status endpoint not fully implemented yet'
    }
  });
});

module.exports = router;
