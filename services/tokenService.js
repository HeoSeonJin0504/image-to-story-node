import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { RefreshToken } from '../models/index.js';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, name: user.name },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  );
};

export const generateRefreshToken = async (user) => {
  const token = jwt.sign(
    { user_id: user.user_id },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  const decoded = jwt.decode(token);
  const expires_at = new Date(decoded.exp * 1000);

  await RefreshToken.destroy({ where: { user_id: user.user_id } });
  await RefreshToken.create({ user_id: user.user_id, token, expires_at });

  return token;
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);

  const storedToken = await RefreshToken.findOne({
    where: { token, user_id: decoded.user_id },
  });

  if (!storedToken) {
    throw new Error('유효하지 않은 Refresh Token입니다.');
  }

  return decoded;
};

//  Refresh Token DB에서 삭제 (로그아웃)
export const revokeRefreshToken = async (token) => {
  await RefreshToken.destroy({ where: { token } });
};