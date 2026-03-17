import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../services/tokenService.js';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;

export const checkDuplicate = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'username은 필수입니다.' });
    }
    const user = await User.findOne({ where: { username } });
    res.json({ exists: !!user });
  } catch (error) {
    logger.error(`중복 확인 에러: ${error.message}`);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export const login = async (req, res) => {
  const ip = getIp(req);
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }
    const user = await User.findOne({ where: { username } });
    if (!user) {
      logger.warn(`[image-to-story] 로그인 실패 - 아이디 없음: ${username}, IP: ${ip}`);
      return res.status(400).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`[image-to-story] 로그인 실패 - 비밀번호 불일치: ${username}, IP: ${ip}`);
      return res.status(400).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    logger.info(`[image-to-story] 로그인 성공 - 사용자: ${username}, IP: ${ip}`);
    res.json({ user_id: user.user_id, name: user.name, accessToken });
  } catch (error) {
    logger.error(`[image-to-story] 로그인 에러 - IP: ${ip}, ${error.message}`);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export const signup = async (req, res) => {
  const ip = getIp(req);
  try {
    const { username, name, password, email } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: '필수 정보를 입력해주세요.' });
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      logger.warn(`[image-to-story] 회원가입 실패 - 중복 아이디: ${username}, IP: ${ip}`);
      return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await User.create({ username, name, password: hashedPassword, email });
    logger.info(`[image-to-story] 회원가입 성공 - 사용자: ${username}, IP: ${ip}`);
    res.json({ user_id: newUser.user_id });
  } catch (error) {
    logger.error(`[image-to-story] 회원가입 에러 - IP: ${ip}, ${error.message}`);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh Token이 없습니다.' });
    }
    const decoded = await verifyRefreshToken(token);
    const user = await User.findOne({ where: { user_id: decoded.user_id } });
    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    const accessToken = generateAccessToken(user);
    res.json({ accessToken, user_id: user.user_id, name: user.name });
  } catch (error) {
    logger.error(`[image-to-story] 토큰 재발급 에러: ${error.message}`);
    res.clearCookie('refreshToken', { path: '/' });
    res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
  }
};

export const logout = async (req, res) => {
  const ip = getIp(req);
  try {
    // refreshToken 쿠키에서 사용자 정보 추출
    let username = '알 수 없음';
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        username = decoded?.username || '알 수 없음';
      } catch (_) {}
    }

    if (token) {
      await revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken', { path: '/' });
    logger.info(`[image-to-story] 로그아웃 성공 - 사용자: ${username}, IP: ${ip}`);
    res.json({ message: '로그아웃 되었습니다.' });
  } catch (error) {
    logger.error(`[image-to-story] 로그아웃 에러: ${error.message}`);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};