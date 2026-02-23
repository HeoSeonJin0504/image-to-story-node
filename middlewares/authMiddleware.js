import { verifyAccessToken } from '../services/tokenService.js';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'ACCESS_TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

export default authMiddleware;