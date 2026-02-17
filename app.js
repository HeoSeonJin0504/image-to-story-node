const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const config = require("./config/env");
const { initDB } = require("./models");
const routes = require("./routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true, // 쿠키 전송 허용 (Refresh Token)
}));

app.use(`/${config.UPLOAD_DIRECTORY}`, express.static(path.join(__dirname, config.UPLOAD_DIRECTORY)));

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