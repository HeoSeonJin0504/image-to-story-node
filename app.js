const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const { initDB } = require("./models");
const routes = require("./routes");

// 배포용
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const fs = require('fs');
  const creds = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
  fs.writeFileSync('./google-credentials.json', creds);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-credentials.json';
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS 설정
// - 개발: 모든 origin 허용 (편의성)
// - 프로덕션: CORS_ORIGINS 환경변수에 등록된 도메인만 허용
if (!isProduction && config.CORS_ORIGINS.length === 0) {
  console.warn('[경고] CORS_ORIGINS가 설정되지 않았습니다. 개발 환경이므로 모든 origin을 허용합니다.');
}

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        // 서버 간 요청(origin 없음)은 허용하지 않음
        if (!origin) return callback(new Error('origin이 없는 요청은 허용되지 않습니다.'));
        if (config.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`허용되지 않은 origin: ${origin}`));
      }
    : true, // 개발 환경: 모든 origin 허용
  credentials: true, // httpOnly 쿠키 전송 허용 (Refresh Token)
}));

app.use(`/${config.UPLOAD_DIRECTORY}`, express.static(path.join(__dirname, config.UPLOAD_DIRECTORY)));
app.use('/audios', express.static('audios'));

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