const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Image, Story } = require("../models");
const { detectStoryWithChatGPT } = require("../services/openaiService");
const config = require("../config/env");

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD_DIRECTORY);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
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

    // 파일 저장 경로 설정
    const fileLocation = path.join(config.UPLOAD_DIRECTORY, file.filename);
    const image_url = `http://localhost:${config.PORT}/${config.UPLOAD_DIRECTORY}/${file.filename}`;

    // DB에 이미지 저장 (image_url, image_description 통합)
    const image = await Image.create({
      user_id: parseInt(user_id),
      original_filename: file.filename,
      image_url,
      image_description: ""
    });
    
    const image_id = image.image_id;

    // OpenAI를 사용하여 동화 생성
    const storyStr = await detectStoryWithChatGPT(fileLocation);

    // storyStr가 유효한 문자열인지 검사
    if (!storyStr || typeof storyStr !== "string") {
      return res.status(500).json({ error: "동화 생성에 실패했습니다." });
    }

    // 정규표현식을 이용하여 동화 제목과 동화 내용을 추출합니다.
    const titleMatch = storyStr.match(/동화 제목:\s*'([^']+)'/);
    const contentMatch = storyStr.match(/동화 내용:\s*'([\s\S]+)'/);

    if (!titleMatch || !contentMatch) {
      return res.status(500).json({ error: "동화 형식 파싱에 실패했습니다." });
    }

    const story_name = titleMatch[1];
    const story_content = contentMatch[1];

    await Story.create({
      filename: file.filename,
      story_name,
      story_content,
      image_id,
      user_id: parseInt(user_id)
    });

    console.log(`filename: ${file.filename}\nstory_name: ${story_name}`);

    res.json({
      filename: file.filename,
      story_name,
      story_content,
      image_url
    });
    
  } catch (error) {
    console.error("이미지 업로드 에러:", error);
    res.status(500).json({ error: error.message });
  }
};