// controllers/authController.js
const { User } = require("../models");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} = require("../services/tokenService");

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';

// Refresh Token 쿠키 설정 공통 옵션 - 배포 환경 개발환경 구분
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,                      // JS 접근 불가 (XSS 방어)
  secure: isProduction,                // 프로덕션에서만 HTTPS 강제
  sameSite: isProduction ? 'none' : 'lax', // 크로스 도메인 배포 대응
  maxAge: 7 * 24 * 60 * 60 * 1000,    // 7일 (ms)
  path: '/',
};

exports.checkDuplicate = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "username은 필수입니다." });
    }

    const user = await User.findOne({ where: { username } });
    res.json({ exists: !!user });
  } catch (error) {
    console.error("중복 확인 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });
    }

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(400).json({ error: "아이디 또는 비밀번호가 잘못되었습니다." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "아이디 또는 비밀번호가 잘못되었습니다." });
    }

    // 토큰 발급
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    // Refresh Token은 httpOnly 쿠키로 전송
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      user_id: user.user_id,
      name: user.name,
      accessToken,
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

exports.signup = async (req, res) => {
  try {
    const { username, name, password, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: "필수 정보를 입력해주세요." });
    }

    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ error: "이미 사용 중인 아이디입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      username,
      name,
      password: hashedPassword,
      email,
    });

    res.json({ user_id: newUser.user_id });
  } catch (error) {
    console.error("회원가입 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /refresh
 * httpOnly 쿠키의 Refresh Token으로 Access Token 재발급
 */
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "Refresh Token이 없습니다." });
    }

    const decoded = await verifyRefreshToken(token);

    const user = await User.findOne({ where: { user_id: decoded.user_id } });

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // Access Token만 새로 발급 (Refresh Token은 유지)
    const accessToken = generateAccessToken(user);

    res.json({ accessToken, user_id: user.user_id, name: user.name });
  } catch (error) {
    console.error("토큰 재발급 에러:", error);
    // Refresh Token도 만료된 경우 → 쿠키 삭제 후 재로그인 유도
    res.clearCookie('refreshToken', { path: '/' });
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." });
  }
};

/**
 * POST /logout
 * DB에서 Refresh Token 삭제 + 쿠키 제거
 */
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await revokeRefreshToken(token);
    }

    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: "로그아웃 되었습니다." });
  } catch (error) {
    console.error("로그아웃 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};