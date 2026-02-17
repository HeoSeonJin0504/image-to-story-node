// services/tokenService.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { RefreshToken } = require('../models');

/**
 * Access Token 발급 (payload: { user_id, name })
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, name: user.name },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  );
};

/**
 * Refresh Token 발급 후 DB 저장
 */
const generateRefreshToken = async (user) => {
  const token = jwt.sign(
    { user_id: user.user_id },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  // 만료 시간 계산 (7일)
  const decoded = jwt.decode(token);
  const expires_at = new Date(decoded.exp * 1000);

  // 기존 토큰 삭제 후 새 토큰 저장 (1인 1토큰 정책)
  await RefreshToken.destroy({ where: { user_id: user.user_id } });
  await RefreshToken.create({ user_id: user.user_id, token, expires_at });

  return token;
};

/**
 * Access Token 검증
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
};

/**
 * Refresh Token 검증 (JWT 서명 + DB 존재 여부)
 */
const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);

  const storedToken = await RefreshToken.findOne({
    where: { token, user_id: decoded.user_id },
  });

  if (!storedToken) {
    throw new Error('유효하지 않은 Refresh Token입니다.');
  }

  return decoded;
};

/**
 * Refresh Token DB에서 삭제 (로그아웃)
 */
const revokeRefreshToken = async (token) => {
  await RefreshToken.destroy({ where: { token } });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
};