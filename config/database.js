// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

// MySQL
// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: 'mysql',
//   logging: false,
//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   }
// });

// Supabase
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  }
});

module.exports = sequelize;