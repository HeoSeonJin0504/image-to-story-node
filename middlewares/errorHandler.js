import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${req.method} ${req.path} - ${err.message}`);
  } else {
    logger.warn(`[${statusCode}] ${req.method} ${req.path} - ${err.message}`);
  }

  // JWT 오류
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: '토큰이 만료되었습니다.' });
  }

  // Multer 오류 (파일 업로드)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '파일 크기가 너무 큽니다.' });
  }

  // 유효성 오류
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // 일반 오류
  res.status(statusCode).json({
    error: isProduction ? '서버 내부 오류가 발생했습니다.' : err.message,
  });
};

export default errorHandler;