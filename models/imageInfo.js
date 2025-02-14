// models/imageInfo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImageInfo = sequelize.define('ImageInfo', {
  image_info_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  image_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(255),
  },
  image_description: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'image_info',
  timestamps: false,
});

module.exports = ImageInfo;