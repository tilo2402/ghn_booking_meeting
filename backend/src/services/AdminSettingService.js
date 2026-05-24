const AdminSetting = require('../models/AdminSetting');

const DEFAULTS = {
  booking_window_days: '14',
  max_booking_duration_hours: '4'
};

class AdminSettingService {
  /** Returns all settings as a plain key→value object */
  static async getAll() {
    const rows = await AdminSetting.findAll();
    const result = { ...DEFAULTS };
    rows.forEach((r) => { result[r.key] = r.value; });
    return result;
  }

  /** Returns the booking window in days (integer) */
  static async getBookingWindowDays() {
    const row = await AdminSetting.findOne({ where: { key: 'booking_window_days' } });
    return parseInt(row?.value ?? DEFAULTS.booking_window_days);
  }

  /** Returns max booking duration in hours (integer) */
  static async getMaxDurationHours() {
    const row = await AdminSetting.findOne({ where: { key: 'max_booking_duration_hours' } });
    return parseInt(row?.value ?? DEFAULTS.max_booking_duration_hours);
  }

  /** Upsert one or more settings. `data` is { key: value, ... } */
  static async updateSettings(data) {
    const ALLOWED_KEYS = ['booking_window_days', 'max_booking_duration_hours'];
    for (const [key, value] of Object.entries(data)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      await AdminSetting.upsert({ key, value: String(value), updated_at: new Date() });
    }
    return this.getAll();
  }
}

module.exports = AdminSettingService;
