const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Story = sequelize.define('Story', {
  story_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  filename: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
  },
  story_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  story_content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  image_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'stories',
  timestamps: false,
});

module.exports = Story;