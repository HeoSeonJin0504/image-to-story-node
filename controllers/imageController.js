const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Image, Story } = require("../models");
const { detectStoryWithChatGPT } = require("../services/openaiService");
const config = require("../config/env");

// memoryStorage (메모리에서 처리) 
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("이미지 파일만 업로드 가능합니다."));
  }
});

exports.uploadMiddleware = upload.single("file");

// 이미지 업로드 + 이야기 생성
exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;
    const { user_id } = req.body;

    if (!file) {
      return res.status(400).json({ error: "파일 업로드 실패" });
    }

    if (!user_id) {
      return res.status(400).json({ error: "user_id는 필수입니다." });
    }

    // 메모리에서 Base64 변환
    const base64Image = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    // OpenAI를 사용하여 동화 생성
    const storyStr = await detectStoryWithChatGPT(base64Image, mimeType);

    if (!storyStr || typeof storyStr !== "string") {
      return res.status(500).json({ error: "동화 생성에 실패했습니다." });
    }

    const titleMatch = storyStr.match(/동화 제목:\s*'([^']+)'/);
    const contentMatch = storyStr.match(/동화 내용:\s*'([\s\S]+)'/);

    if (!titleMatch || !contentMatch) {
      return res.status(500).json({ error: "동화 형식 파싱에 실패했습니다." });
    }

    const story_name = titleMatch[1];
    const story_content = contentMatch[1];

    // 프론트에서 저장 시 필요한 데이터와 함께 반환
    // base64는 저장 확정 시 프론트에서 다시 전송하지 않도록 서버에서 임시 보관하는 대신
    // 생성된 이야기 데이터만 반환하고 파일은 프론트가 그대로 들고 있도록 함
    res.json({
      story_name,
      story_content,
      original_filename: file.originalname,
    });

  } catch (error) {
    console.error("이미지 업로드 에러:", error);
    res.status(500).json({ error: error.message });
  }
};

// 사용자가 확인 후 저장
exports.saveStory = async (req, res) => {
  try {
    const file = req.file;
    const { user_id, story_name, story_content } = req.body;

    if (!file) {
      return res.status(400).json({ error: "파일 업로드 실패" });
    }

    if (!user_id || !story_name || !story_content) {
      return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
    }

    // 파일명 생성 후 디스크에 저장
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    const filePath = path.join(config.UPLOAD_DIRECTORY, filename);

    fs.writeFileSync(filePath, file.buffer);

    const image_url = `http://localhost:${config.PORT}/${config.UPLOAD_DIRECTORY}/${filename}`;

    // 이미지 DB 저장
    const image = await Image.create({
      user_id: parseInt(user_id),
      original_filename: filename,
      image_url,
      image_description: ""
    });

    const image_id = image.image_id;

    // 이야기 DB 저장
    await Story.create({
      filename,
      story_name,
      story_content,
      image_id,
      user_id: parseInt(user_id)
    });

    console.log(`filename: ${filename}\nstory_name: ${story_name}`);

    res.json({
      filename,
      story_name,
      story_content,
      image_url
    });

  } catch (error) {
    console.error("이야기 저장 에러:", error);
    res.status(500).json({ error: error.message });
  }
};