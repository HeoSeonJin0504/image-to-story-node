const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Image, Story } = require("../models");
const { detectStoryWithChatGPT } = require("../services/openaiService");
const config = require("../config/env");

// memoryStorage - 디스크에 저장하지 않고 메모리에서 처리
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

// 이미지 업로드 + 이야기 생성만 처리 (DB 저장 없음)
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

    const base64Image = file.buffer.toString("base64");
    const mimeType = file.mimetype;

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

// 사용자가 확인 후 저장 확정 시 처리
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

    // 이야기 DB 저장 (created_at은 defaultValue로 자동 입력)
    const story = await Story.create({
      filename,
      story_name,
      story_content,
      image_id,
      user_id: parseInt(user_id),
    });

    console.log(`filename: ${filename}\nstory_name: ${story_name}`);

    res.json({
      filename,
      story_name,
      story_content,
      image_url,
      created_at: story.created_at,
    });

  } catch (error) {
    console.error("이야기 저장 에러:", error);
    res.status(500).json({ error: error.message });
  }
};

// 이야기 목록 조회 (user_id 기준)
exports.getStoryList = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "user_id는 필수입니다." });
    }

    const stories = await Story.findAll({
      where: { user_id: parseInt(user_id) },
      include: [
        {
          association: 'image',
          attributes: ['image_url'],
        }
      ],
      attributes: ['story_id', 'story_name', 'created_at'],
      order: [['story_id', 'DESC']],
    });

    const result = stories.map(story => ({
      story_id: story.story_id,
      story_name: story.story_name,
      image_url: story.image?.image_url ?? null,
      created_at: story.created_at,
    }));

    res.json(result);

  } catch (error) {
    console.error("이야기 목록 조회 에러:", error);
    res.status(500).json({ error: error.message });
  }
};

// 이야기 상세 조회 (story_id 기준)
exports.getStoryDetail = async (req, res) => {
  try {
    const { story_id } = req.params;

    if (!story_id) {
      return res.status(400).json({ error: "story_id는 필수입니다." });
    }

    const story = await Story.findOne({
      where: { story_id: parseInt(story_id) },
      include: [
        {
          association: 'image',
          attributes: ['image_url'],
        }
      ],
      attributes: ['story_id', 'story_name', 'story_content', 'created_at'],
    });

    if (!story) {
      return res.status(404).json({ error: "이야기를 찾을 수 없습니다." });
    }

    res.json({
      story_id: story.story_id,
      story_name: story.story_name,
      story_content: story.story_content,
      image_url: story.image?.image_url ?? null,
      created_at: story.created_at,
    });

  } catch (error) {
    console.error("이야기 상세 조회 에러:", error);
    res.status(500).json({ error: error.message });
  }
};

// 이야기 + 이미지 삭제
exports.deleteStory = async (req, res) => {
  try {
    const { story_id } = req.params;
    const user_id = req.user.user_id;

    if (!story_id) {
      return res.status(400).json({ error: "story_id는 필수입니다." });
    }

    // 본인 소유 확인
    const story = await Story.findOne({
      where: { story_id: parseInt(story_id), user_id },
      include: [{ association: 'image' }],
    });

    if (!story) {
      return res.status(404).json({ error: "이야기를 찾을 수 없습니다." });
    }

    const filename = story.filename;
    const image_id = story.image_id;

    // 1. Story DB 삭제
    await story.destroy();

    // 2. Image DB 삭제
    await Image.destroy({ where: { image_id } });

    // 3. 디스크 파일 삭제
    const filePath = path.join(config.UPLOAD_DIRECTORY, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`삭제 완료 - story_id: ${story_id}, filename: ${filename}`);

    res.json({ message: "이야기가 삭제되었습니다." });

  } catch (error) {
    console.error("이야기 삭제 에러:", error);
    res.status(500).json({ error: error.message });
  }
};