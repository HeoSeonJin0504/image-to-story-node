const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else {
    console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? '서버 내부 오류가 발생했습니다.'
    : err.message || '요청을 처리할 수 없습니다.';

  res.status(statusCode).json({ error: message });
};

export default errorHandler;