const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { Booking, Room, User } = require('../models');
const { sequelize } = require('../config/database');

function getDateRange(query) {
  const now = new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to
    ? new Date(new Date(query.to).setHours(23, 59, 59, 999))
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

// GET /api/dashboard/metrics
router.get('/metrics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    // Booking counts by status
    const statusRows = await sequelize.query(
      `SELECT status, COUNT(*) AS count FROM bookings
       WHERE start_time BETWEEN :from AND :to
       GROUP BY status`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );
    const counts = {};
    for (const r of statusRows) counts[r.status] = parseInt(r.count);
    const totalBookings = Object.values(counts).reduce((a, b) => a + b, 0);
    const cancelled = counts.cancelled || 0;
    const noShowRate = totalBookings > 0
      ? parseFloat((cancelled / totalBookings * 100).toFixed(1))
      : 0;

    // Average duration (non-cancelled)
    const [durRow] = await sequelize.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)) AS avg_minutes
       FROM bookings WHERE status != 'cancelled' AND start_time BETWEEN :from AND :to`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );
    const avgMinutes = parseInt(durRow?.avg_minutes || 0);

    // Occupancy rate: booked_minutes / (rooms × 15h × days) × 100
    const totalRooms = await Room.count({ where: { is_active: true } });
    const days = Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)));
    const [bookedRow] = await sequelize.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0) AS total_minutes
       FROM bookings WHERE status != 'cancelled' AND start_time BETWEEN :from AND :to`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );
    const totalBooked = parseFloat(bookedRow?.total_minutes || 0);
    const workingTotal = totalRooms * 15 * 60 * days;
    const occupancyRate = workingTotal > 0
      ? Math.min(parseFloat((totalBooked / workingTotal * 100).toFixed(1)), 100)
      : 0;

    // Peak hours (VN timezone, hour 7–21)
    const peakHours = await sequelize.query(
      `SELECT EXTRACT(HOUR FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,
              COUNT(*) AS count
       FROM bookings
       WHERE status != 'cancelled' AND start_time BETWEEN :from AND :to
       GROUP BY hour ORDER BY hour`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );

    // Top 8 rooms by booking count
    const topRooms = await sequelize.query(
      `SELECT r.name, r.location, r.floor,
              COUNT(b.id) AS booking_count,
              ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)) AS avg_minutes
       FROM rooms r
       LEFT JOIN bookings b ON r.id = b.room_id
         AND b.status != 'cancelled'
         AND b.start_time BETWEEN :from AND :to
       WHERE r.is_active = true
       GROUP BY r.id, r.name, r.location, r.floor
       ORDER BY booking_count DESC
       LIMIT 8`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );

    // Top 5 users by booking count
    const topUsers = await sequelize.query(
      `SELECT u.full_name, u.email,
              COUNT(b.id) FILTER (WHERE b.status != 'cancelled') AS total,
              COUNT(b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled
       FROM users u
       JOIN bookings b ON u.id = b.user_id
         AND b.start_time BETWEEN :from AND :to
       GROUP BY u.id, u.full_name, u.email
       ORDER BY total DESC
       LIMIT 5`,
      { replacements: { from, to }, type: sequelize.QueryTypes.SELECT }
    );

    res.json({
      data: {
        period: { from, to },
        summary: {
          total_bookings:        totalBookings,
          cancelled:             cancelled,
          completed:             counts.completed  || 0,
          active:                counts.active     || 0,
          pending:               counts.pending    || 0,
          confirmed:             counts.confirmed  || 0,
          no_show_rate:          noShowRate,
          avg_duration_minutes:  avgMinutes,
          occupancy_rate:        occupancyRate,
          total_rooms:           totalRooms,
        },
        peak_hours: peakHours.map(r => ({ hour: r.hour, count: parseInt(r.count) })),
        top_rooms: topRooms.map(r => ({
          name:          r.name,
          location:      r.location,
          floor:         r.floor,
          booking_count: parseInt(r.booking_count),
          avg_minutes:   parseInt(r.avg_minutes) || 0,
        })),
        top_users: topUsers.map(r => ({
          full_name: r.full_name,
          email:     r.email,
          total:     parseInt(r.total),
          cancelled: parseInt(r.cancelled),
        })),
      },
    });
  } catch (err) {
    console.error('[dashboard/metrics]', err);
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/dashboard/report — detailed booking list for CSV export
router.get('/report', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const where = { start_time: { [Op.between]: [from, to] } };
    if (req.query.status) where.status = req.query.status;

    const bookings = await Booking.findAll({
      where,
      include: [
        { model: Room, attributes: ['name', 'location', 'floor', 'capacity'] },
        { model: User, attributes: ['full_name', 'email', 'role'] },
      ],
      order: [['start_time', 'ASC']],
    });

    res.json({ data: { count: bookings.length, bookings } });
  } catch (err) {
    console.error('[dashboard/report]', err);
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

module.exports = router;

