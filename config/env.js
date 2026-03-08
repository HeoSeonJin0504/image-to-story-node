export default {
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  UPLOAD_DIRECTORY: process.env.UPLOAD_DIRECTORY || 'images',
  AUDIO_DIRECTORY: process.env.AUDIO_DIRECTORY || 'audios',
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'BASE_URL',
];