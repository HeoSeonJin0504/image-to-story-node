const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define('Image', {
  image_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(255),
  },
  image_description: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'images',
  timestamps: false,
});

module.exports = Image;