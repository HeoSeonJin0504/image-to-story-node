import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

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
  audio_url: {   // TTS로 생성된 음성 파일 URL
    type: DataTypes.STRING(255),
    allowNull: true, // TTS 실패해도 동화 저장은 성공하도록 nullable
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'stories',
  timestamps: false,
});

export default Story;