const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const rateLimitHandler = (req, res) => {
  res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
};

// user_id + IP 조합 키: 계정을 새로 만들어도 IP가 같으면 동일하게 카운트
const userAndIpKey = (req) => {
  const ip = ipKeyGenerator(req);
  return req.user?.user_id ? `${req.user.user_id}:${ip}` : ip;
};

// 동화 생성 제한: user+IP 기준 1시간 3회
const storyGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: userAndIpKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// TTS 미리듣기 제한: user+IP 기준 1시간 3회
const ttsPreviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: userAndIpKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 동화 저장 제한: user+IP 기준 1시간 5회
const storySaveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: userAndIpKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 로그인 제한: IP 기준 1시간 5회
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({ error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 회원가입 제한: IP 기준 1시간 2회
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({ error: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  storyGenerateLimiter,
  ttsPreviewLimiter,
  storySaveLimiter,
  loginLimiter,
  signupLimiter,
};