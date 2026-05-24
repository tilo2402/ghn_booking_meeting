const BookingService = require('../services/BookingService');

/**
 * Controller layer cho booking management
 */

class BookingController {
  /**
   * GET /api/bookings
   * Lấy danh sách booking của user hiện tại
   */
  static async getMyBookings(req, res) {
    try {
      const userId = req.user.id;
      const status = req.query.status; // optional filter

      const bookings = await BookingService.getUserBookings(userId, status);

      res.json({
        status: 'success',
        data: {
          count: bookings.length,
          bookings
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: error.message || 'Failed to get bookings'
        }
      });
    }
  }

  /**
   * GET /api/bookings/:id
   * Lấy chi tiết 1 booking
   */
  static async getBookingById(req, res) {
    try {
      const { id } = req.params;

      const booking = await BookingService.getBookingById(id);

      // Kiểm tra user có quyền xem không (owner hoặc admin)
      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'You do not have permission to view this booking'
          }
        });
      }

      res.json({
        status: 'success',
        data: { booking }
      });
    } catch (error) {
      console.error('Get booking error:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to get booking'
        }
      });
    }
  }

  /**
   * POST /api/bookings
   * Tạo booking mới
   * Body: { room_id, title, participants_count, start_time, end_time, recurring?, notes? }
   */
  static async createBooking(req, res) {
    try {
      const userId = req.user.id;
      const bookingData = req.body;

      const booking = await BookingService.createBooking(userId, bookingData);

      res.status(201).json({
        status: 'success',
        data: { booking }
      });
    } catch (error) {
      console.error('Create booking error:', error);

      let statusCode = 500;
      if (
        error.message.includes('Missing') ||
        error.message.includes('required') ||
        error.message.includes('after') ||
        error.message.includes('capacity') ||
        error.message.includes('duration') ||
        error.message.includes('advance') ||
        error.message.includes('VIP') ||
        error.message.includes('already booked')
      ) {
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to create booking'
        }
      });
    }
  }

  /**
   * PUT /api/bookings/:id
   * Cập nhật booking (extend/early finish)
   * Body: { action: 'extend' | 'early_finish', new_end_time? }
   */
  static async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const { action, new_end_time, title, notes, start_time, end_time, participants_count } = req.body;

      // Check user permission
      const booking = await BookingService.getBookingById(id);
      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'You do not have permission to modify this booking'
          }
        });
      }

      const updatedBooking = await BookingService.updateBooking(id, {
        action,
        new_end_time,
        title,
        notes,
        start_time,
        end_time,
        participants_count,
      });

      res.json({
        status: 'success',
        data: { booking: updatedBooking }
      });
    } catch (error) {
      console.error('Update booking error:', error);

      let statusCode = 500;
      if (
        error.message.includes('required') ||
        error.message.includes('after') ||
        error.message.includes('Invalid action') ||
        error.message.includes('duration') ||
        error.message.includes('conflicts')
      ) {
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to update booking'
        }
      });
    }
  }

  /**
   * DELETE /api/bookings/:id
   * Hủy booking
   */
  /**
   * GET /api/bookings/room/:roomId
   * Lấy tất cả booking của 1 phòng trong khoảng thời gian (cho calendar view)
   */
  static async getRoomBookings(req, res) {
    try {
      const { roomId } = req.params;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: { status: 400, message: 'start_date and end_date are required' }
        });
      }

      const bookings = await BookingService.getRoomBookings(
        roomId,
        new Date(start_date),
        new Date(end_date),
        req.user.role === 'admin'
      );

      res.json({
        status: 'success',
        data: { bookings }
      });
    } catch (error) {
      console.error('Get room bookings error:', error);
      res.status(500).json({
        error: { status: 500, message: error.message || 'Failed to get room bookings' }
      });
    }
  }

  static async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { message } = req.body || {};

      // Admin can cancel any booking; regular users only their own
      const booking = await BookingService.cancelBooking(id, userId, message || null);

      res.json({
        status: 'success',
        message: 'Booking cancelled successfully',
        data: { booking }
      });
    } catch (error) {
      console.error('Cancel booking error:', error);

      let statusCode = 500;
      if (error.message.includes('only cancel your own')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('Cannot cancel')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to cancel booking'
        }
      });
    }
  }
}

module.exports = BookingController;
