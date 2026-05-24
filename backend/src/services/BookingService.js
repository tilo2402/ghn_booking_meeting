const { Booking, Room, User, CheckIn } = require('../models');
const { Op } = require('sequelize');
const AdminSettingService = require('./AdminSettingService');
require('dotenv').config();

/**
 * Service layer cho booking management
 * Xử lý: create, list, update, delete bookings + conflict detection
 */

class BookingService {
  /**
   * Lấy danh sách booking của user
   */
  static async getUserBookings(userId, status = null) {
    try {
      const where = { user_id: userId };

      // Filter by status nếu có
      if (status) {
        where.status = status;
      }

      const bookings = await Booking.findAll({
        where,
        include: [
          {
            association: 'checkin',
            attributes: ['id', 'check_in_time', 'method', 'is_valid']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'location', 'floor', 'capacity', 'code'],
            include: [
              {
                association: 'amenities',
                attributes: ['amenity']
              }
            ]
          }
        ],
        order: [['start_time', 'DESC']]
      });

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 booking
   */
  static async getBookingById(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            association: 'checkin',
            attributes: ['id', 'check_in_time', 'method', 'is_valid']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'location', 'floor', 'capacity', 'code'],
            include: [
              {
                association: 'amenities',
                attributes: ['amenity']
              }
            ]
          },
          {
            model: User,
            attributes: ['id', 'email', 'full_name', 'department']
          }
        ]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả booking của 1 phòng trong khoảng thời gian.
   * isAdmin=true → trả hết; isAdmin=false → ẩn booking trong "locked period" (ngoài cửa sổ đặt phòng)
   */
  static async getRoomBookings(roomId, startDate, endDate, isAdmin = false) {
    try {
      const where = {
        room_id: roomId,
        status: { [Op.in]: ['pending', 'confirmed', 'active', 'completed'] },
        start_time: { [Op.lt]: endDate },
        end_time: { [Op.gt]: startDate }
      };

      // Regular users cannot see bookings beyond the booking window
      if (!isAdmin) {
        const windowDays = await AdminSettingService.getBookingWindowDays();
        const maxVisible = new Date();
        maxVisible.setDate(maxVisible.getDate() + windowDays);
        where.start_time = { [Op.lt]: endDate, [Op.lte]: maxVisible };
      }

      const bookings = await Booking.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'full_name', 'email', 'department']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'code', 'location', 'floor']
          }
        ],
        order: [['start_time', 'ASC']]
      });
      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Kiểm tra conflict booking
   */
  static async checkTimeConflict(roomId, startTime, endTime, excludeBookingId = null) {
    try {
      const where = {
        room_id: roomId,
        status: {
          [Op.in]: ['pending', 'confirmed', 'active']
        },
        [Op.or]: [
          // Booking bắt đầu trong range
          {
            start_time: {
              [Op.gte]: startTime,
              [Op.lt]: endTime
            }
          },
          // Booking kết thúc trong range
          {
            end_time: {
              [Op.gt]: startTime,
              [Op.lte]: endTime
            }
          },
          // Booking cover cả range
          {
            start_time: { [Op.lte]: startTime },
            end_time: { [Op.gte]: endTime }
          }
        ]
      };

      if (excludeBookingId) {
        where.id = { [Op.ne]: excludeBookingId };
      }

      const conflict = await Booking.findOne({ where });
      return conflict;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo booking mới
   */
  static async createBooking(userId, bookingData) {
    try {
      const {
        room_id,
        title,
        participants_count,
        start_time,
        end_time,
        recurring,
        notes
      } = bookingData;

      // Validate required fields
      if (!room_id || !title || !participants_count || !start_time || !end_time) {
        throw new Error('Missing required fields');
      }

      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      // Validate time
      if (endTime <= startTime) {
        throw new Error('end_time must be after start_time');
      }

      // Get room để check capacity & constraints
      const room = await Room.findByPk(room_id);
      if (!room || !room.is_active) {
        throw new Error('Room not found or inactive');
      }

      // Get user để check role & constraints
      const user = await User.findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Validate capacity
      if (participants_count > room.capacity) {
        throw new Error(`Room capacity is ${room.capacity}, but ${participants_count} participants requested`);
      }

      // Validate VIP rooms (chỉ admin/vip được book)
      if (room.is_vip && user.role !== 'admin' && user.role !== 'vip') {
        throw new Error('This is a VIP room. Only admins and VIPs can book');
      }

      // Validate booking duration (max 4 hours)
      const maxDuration = parseInt(process.env.MAX_BOOKING_DURATION_HOURS || 4);
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      if (durationHours > maxDuration) {
        throw new Error(`Max booking duration is ${maxDuration} hours`);
      }

      // Validate booking window — admin bypasses this limit
      if (user.role !== 'admin') {
        const windowDays = await AdminSettingService.getBookingWindowDays();
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + windowDays);
        if (startTime > maxDate) {
          throw new Error(`Cannot book more than ${windowDays} days in advance`);
        }
      }

      // Check for time conflicts
      const conflict = await this.checkTimeConflict(room_id, startTime, endTime);
      if (conflict) {
        throw new Error(`Room is already booked for this time slot`);
      }

      // Tạo booking
      const booking = await Booking.create({
        room_id,
        user_id: userId,
        title,
        participants_count: parseInt(participants_count),
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed', // Tạo ngay với status confirmed (không cần pending)
        recurring: recurring || 'none',
        notes
      });

      return await this.getBookingById(booking.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật booking (extend/early finish)
   */
  static async updateBooking(bookingId, updateData) {
    try {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const { action, new_end_time } = updateData;

      if (action === 'edit') {
        const { title, notes, start_time, end_time, participants_count } = updateData;
        const newStart = start_time ? new Date(start_time) : new Date(booking.start_time);
        const newEnd   = end_time   ? new Date(end_time)   : new Date(booking.end_time);

        if (newEnd <= newStart) {
          throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
        }

        // Check max duration
        const maxDuration = parseInt(process.env.MAX_BOOKING_DURATION_HOURS || 4);
        const durationHours = (newEnd - newStart) / (1000 * 60 * 60);
        if (durationHours > maxDuration) {
          throw new Error(`Thời gian tối đa là ${maxDuration} giờ`);
        }

        // Check conflict
        const conflict = await this.checkTimeConflict(booking.room_id, newStart, newEnd, bookingId);
        if (conflict) {
          throw new Error('Phòng đã có người đặt trong khung giờ này');
        }

        if (title !== undefined)             booking.title              = title;
        if (notes !== undefined)             booking.notes              = notes;
        if (participants_count !== undefined) booking.participants_count = participants_count;
        booking.start_time = newStart;
        booking.end_time   = newEnd;
      } else if (action === 'extend') {
        if (!new_end_time) {
          throw new Error('new_end_time is required for extend action');
        }

        const newEndTime = new Date(new_end_time);
        const currentEndTime = new Date(booking.end_time);

        if (newEndTime <= currentEndTime) {
          throw new Error('new_end_time must be after current end_time');
        }

        // Check max duration
        const maxDuration = parseInt(process.env.MAX_BOOKING_DURATION_HOURS || 4);
        const durationHours = (newEndTime - new Date(booking.start_time)) / (1000 * 60 * 60);
        if (durationHours > maxDuration) {
          throw new Error(`Max booking duration is ${maxDuration} hours`);
        }

        // Check conflict với next booking
        const conflict = await this.checkTimeConflict(
          booking.room_id,
          currentEndTime,
          newEndTime,
          bookingId
        );
        if (conflict) {
          throw new Error('Cannot extend: next booking conflicts');
        }

        booking.end_time = newEndTime;
      } else if (action === 'early_finish') {
        booking.status = 'completed';
      } else {
        throw new Error('Invalid action. Use "extend" or "early_finish"');
      }

      await booking.save();
      return await this.getBookingById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hủy booking
   * @param {string} bookingId
   * @param {string} userId - người thực hiện hủy
   * @param {string|null} message - lời nhắn của admin khi hủy booking người khác
   */
  static async cancelBooking(bookingId, userId, message = null) {
    try {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Kiểm tra user là owner hoặc admin
      if (booking.user_id !== userId) {
        const user = await User.findByPk(userId);
        if (user.role !== 'admin') {
          throw new Error('You can only cancel your own bookings');
        }
      }

      // Không thể hủy booking đã hoàn thành
      if (booking.status === 'completed') {
        throw new Error('Cannot cancel a booking that has already completed');
      }

      booking.status = 'cancelled';
      if (message) booking.cancellation_message = message.trim();
      await booking.save();

      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-cancel booking (background job)
   * Gọi mỗi phút từ cron job
   */
  static async autoCancelNoShowBookings() {
    try {
      const timeoutMinutes = parseInt(process.env.AUTO_CHECKIN_TIMEOUT_MINUTES || 15);
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - timeoutMs);

      // Tìm booking:
      // - Status = confirmed (chưa check-in)
      // - Start time trong quá khứ nhưng không quá 15 phút
      const noShowBookings = await Booking.findAll({
        where: {
          status: 'confirmed',
          start_time: {
            [Op.lte]: cutoffTime
          }
        },
        include: [
          {
            association: 'checkin',
            attributes: ['id'],
            required: false
          }
        ]
      });

      // Filter những booking không có checkin
      const toCancel = noShowBookings.filter(b => !b.checkin);

      for (const booking of toCancel) {
        booking.status = 'cancelled';
        await booking.save();
        console.log(`[Auto-Cancel] Booking ${booking.id} cancelled (no check-in)`);
      }

      return toCancel.length;
    } catch (error) {
      console.error('Auto-cancel error:', error);
      throw error;
    }
  }
}

module.exports = BookingService;
