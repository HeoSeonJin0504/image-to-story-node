// app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { initDB } = require("./models");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 8000;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정
const origins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : [];
app.use(cors({
  origin: origins,
  credentials: true,
}));

// 정적 파일 제공 (이미지 폴더)
app.use(`/${process.env.UPLOAD_DIRECTORY}`, express.static(path.join(__dirname, process.env.UPLOAD_DIRECTORY)));

// 라우터 등록
app.use("/", routes);

// 루트 엔드포인트
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Server!" });
});

// DB 초기화 후 서버 시작
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
});