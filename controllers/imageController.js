const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Image, ImageInfo, Story } = require("../models");
const { detectStoryWithChatGPT } = require("../services/openaiService");

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIRECTORY || "images");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

exports.uploadMiddleware = upload.single("file");

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "파일 업로드 실패" });
    }

    // 파일 저장 경로 설정
    const fileLocation = path.join(process.env.UPLOAD_DIRECTORY || "images", file.filename);

    // DB에 이미지 저장
    const image = await Image.create({
      user_id: 1,  // 기본 사용자 ID (추후 인증 적용)
      original_filename: file.filename
    });
    const image_id = image.image_id;
    const image_url = `http://localhost:${process.env.PORT || 8000}/${process.env.UPLOAD_DIRECTORY || "images"}/${file.filename}`;

    // 이미지 정보 저장
    await ImageInfo.create({
      image_id,
      image_url,
      image_description: ""
    });

    // OpenAI를 사용하여 동화 생성
    const storyStr = await detectStoryWithChatGPT(fileLocation);

    // storyStr가 유효한 문자열인지 검사
    if (!storyStr || typeof storyStr !== "string") {
      return res.status(400).json({ error: "OpenAI 응답이 올바르지 않습니다." });
    }

    // 정규표현식을 이용하여 동화 제목과 동화 내용을 추출합니다.
    const titleMatch = storyStr.match(/동화 제목:\s*'([^']+)'/);
    const contentMatch = storyStr.match(/동화 내용:\s*'([\s\S]+)'/);

    if (!titleMatch || !contentMatch) {
      return res.status(400).json({ error: "파싱 오류, OpenAI 응답 형식이 올바르지 않습니다." });
    }

    const story_name = titleMatch[1];
    const story_content = contentMatch[1];

    await Story.create({
      filename: file.filename,
      story_name,
      story_content,
      image_id,
      user_id: 1
    });

    console.log(`filename: ${file.filename}\nstory_name: ${story_name}\nstory_content: ${story_content}`);

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