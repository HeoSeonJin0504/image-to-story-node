require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'UPLOAD_DIRECTORY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`필수 환경변수 ${varName}이(가) 설정되지 않았습니다.`);
  }
});

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  UPLOAD_DIRECTORY: process.env.UPLOAD_DIRECTORY,
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : [],
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};