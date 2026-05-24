const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckIn = sequelize.define('checkins', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  method: {
    type: DataTypes.ENUM(
      'qr_code',
      'nfc',
      'tablet',
      'mobile_app'
    ),
    allowNull: false,
    comment: 'Check-in method used'
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether check-in was successful'
  },
  device_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Device that performed check-in'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'checkins'
});

module.exports = CheckIn;
