require('dotenv').config();

// Google 자격증명 복원
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const fs = require('fs');
  const creds = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
  fs.writeFileSync('./google-credentials.json', creds);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-credentials.json';
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const { initDB } = require("./models");
const routes = require("./routes");

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// X-Powered-By 헤더 제거 (서버 정보 노출 방지)
app.disable('x-powered-by');

// Render 리버스 프록시 신뢰 설정 (rate limit IP 정확도 향상)
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS 설정
if (!isProduction && config.CORS_ORIGINS.length === 0) {
  console.warn('[경고] CORS_ORIGINS가 설정되지 않았습니다. 개발 환경이므로 모든 origin을 허용합니다.');
}

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`허용되지 않은 origin: ${origin}`));
      }
    : true,
  credentials: true,
}));

app.use(`/${config.UPLOAD_DIRECTORY}`, express.static(path.join(__dirname, config.UPLOAD_DIRECTORY)));
app.use('/audios', express.static('audios'));

// 헬스체크 엔드포인트 (슬립 방지용)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use("/", routes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Server!" });
});

initDB().then(() => {
  app.listen(config.PORT, () => {
    console.log(`서버가 포트 ${config.PORT}에서 실행 중입니다.`);
  });
}).catch(err => {
  console.error("서버 시작 실패:", err);
  process.exit(1);
});