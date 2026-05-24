const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AdminSettingService = require('../services/AdminSettingService');

// GET /api/admin/settings
router.get('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { settings } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/settings
router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { booking_window_days, max_booking_duration_hours } = req.body;
    const data = {};
    if (booking_window_days !== undefined) {
      const v = parseInt(booking_window_days);
      if (isNaN(v) || v < 1 || v > 365) {
        return res.status(400).json({ error: { status: 400, message: 'booking_window_days phải từ 1–365' } });
      }
      data.booking_window_days = v;
    }
    if (max_booking_duration_hours !== undefined) {
      const v = parseInt(max_booking_duration_hours);
      if (isNaN(v) || v < 1 || v > 24) {
        return res.status(400).json({ error: { status: 400, message: 'max_booking_duration_hours phải từ 1–24' } });
      }
      data.max_booking_duration_hours = v;
    }
    const settings = await AdminSettingService.updateSettings(data);
    res.json({ status: 'success', data: { settings } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/users - List all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  res.status(501).json({ error: { status: 501, message: 'Not implemented' } });
});

module.exports = router;

