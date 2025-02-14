// controllers/imageController.js
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
    if (!file) return res.status(400).json({ error: "파일 업로드 실패" });
    
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
    // 문자열 파싱 (형식: {객체1, 객체2, 객체3, 동화 제목: '동화 제목', 동화 내용: '동화 내용'})
    const data = storyStr.replace(/[{}]/g, "");
    const items = data.split(", ", 5);
    
    if (items.length !== 5) {
      return res.status(400).json({ error: "프롬프트 오류, 다시 시도해주세요." });
    }
    
    const story_name = items[3].split(": ")[1].replace(/'/g, "");
    const story_content = items[4].split(": ")[1].replace(/'/g, "");
    
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