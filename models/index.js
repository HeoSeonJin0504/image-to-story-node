const sequelize = require('../config/database');
const User = require('./user');
const Image = require('./image');
const ImageInfo = require('./imageInfo');
const Story = require('./story');

User.hasMany(Image, { foreignKey: 'user_id', as: 'images' });
Image.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

Image.hasOne(ImageInfo, { foreignKey: 'image_id', as: 'image_info' });
ImageInfo.belongsTo(Image, { foreignKey: 'image_id', as: 'image' });

User.hasMany(Story, { foreignKey: 'user_id', as: 'stories' });
Story.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

Image.hasOne(Story, { foreignKey: 'image_id', as: 'story' });
Story.belongsTo(Image, { foreignKey: 'image_id', as: 'image' });

const initDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('DB 연결 성공');
  } catch (error) {
    console.error('DB 연결 실패:', error);
    throw error;
  }
};

module.exports = { sequelize, User, Image, ImageInfo, Story, initDB };