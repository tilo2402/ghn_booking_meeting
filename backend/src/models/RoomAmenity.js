const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomAmenity = sequelize.define('room_amenities', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  amenity: {
    type: DataTypes.ENUM(
      'TV',
      'Audio Conference',
      'Video Conference',
      'Projector'
    ),
    allowNull: false
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
  tableName: 'room_amenities'
});

module.exports = RoomAmenity;
