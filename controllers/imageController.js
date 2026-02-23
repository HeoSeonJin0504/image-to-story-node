import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import { Image, Story } from '../models/index.js';
import { detectStoryWithChatGPT } from '../services/openaiService.js';
import { synthesizeSpeech, deleteAudioFile, synthesizeSpeechPreview } from '../services/ttsService.js';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

export const uploadMiddleware = upload.single('file');

// 이미지 업로드 + 이야기 생성만 처리 (DB 저장 없음)
export const uploadImage = async (req, res, next) => {
  try {
    const file = req.file;
    const { user_id } = req.body;

    if (!file) return res.status(400).json({ error: '파일 업로드 실패' });
    if (!user_id) return res.status(400).json({ error: 'user_id는 필수입니다.' });

    const base64Image = file.buffer.toString('base64');
    const mimeType = file.mimetype;

    const storyStr = await detectStoryWithChatGPT(base64Image, mimeType);

    if (!storyStr || typeof storyStr !== 'string') {
      return res.status(500).json({ error: '동화 생성에 실패했습니다.' });
    }

    const titleMatch = storyStr.match(/동화 제목:\s*'([^']+)'/);
    const contentMatch = storyStr.match(/동화 내용:\s*'([\s\S]+)'/);

    if (!titleMatch || !contentMatch) {
      return res.status(500).json({ error: '동화 형식 파싱에 실패했습니다.' });
    }

    res.json({
      story_name: titleMatch[1],
      story_content: contentMatch[1],
      original_filename: file.originalname,
    });
  } catch (error) {
    // 변경: 직접 응답 → next(error)로 에러 핸들러에 위임
    next(error);
  }
};

// 사용자가 확인 후 저장 확정 시 처리
export const saveStory = async (req, res, next) => {
  let filename = null;

  try {
    const file = req.file;
    const { user_id, story_name, story_content, voice_gender = 'FEMALE' } = req.body;

    if (!file) return res.status(400).json({ error: '파일 업로드 실패' });
    if (!user_id || !story_name || !story_content) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

     // 1. 이미지 파일 저장
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    filename = uniqueSuffix + path.extname(file.originalname);
    const filePath = path.join(config.UPLOAD_DIRECTORY, filename);

    if (!fs.existsSync(config.UPLOAD_DIRECTORY)) {
      fs.mkdirSync(config.UPLOAD_DIRECTORY, { recursive: true });
    }
    if (!fs.existsSync(config.AUDIO_DIRECTORY)) {
      fs.mkdirSync(config.AUDIO_DIRECTORY, { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);

    const image_url = `${config.BASE_URL}/${config.UPLOAD_DIRECTORY}/${filename}`;

     // 2. 이미지 DB 저장
    const image = await Image.create({
      user_id: parseInt(user_id),
      original_filename: filename,
      image_url,
      image_description: '',
    });

    // 3. TTS 음성 생성 및 저장
    //    실패해도 동화 저장은 계속 진행 (audio_url은 null로 저장)
    let audio_url = null;
    try {
      audio_url = await synthesizeSpeech(story_content, filename, voice_gender);
      console.log(`TTS 생성 완료: ${audio_url}`);
    } catch (ttsError) {
      // TTS 실패는 치명적 에러가 아니므로 next()로 넘기지 않고 로그만 남김
      console.error('TTS 생성 실패 (동화 저장은 계속 진행):', ttsError.message);
    }

    // 4. 이야기 DB 저장
    const story = await Story.create({
      filename,
      story_name,
      story_content,
      image_id: image.image_id,
      user_id: parseInt(user_id),
      audio_url,
    });

    res.json({
      filename,
      story_name,
      story_content,
      image_url,
      audio_url,
      created_at: story.created_at,
    });
  } catch (error) {
    // 저장 도중 에러 발생 시 이미 저장된 이미지 파일 롤백
    if (filename) {
      const filePath = path.join(config.UPLOAD_DIRECTORY, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`롤백: 이미지 파일 삭제 완료 (${filename})`);
      }
    }
    next(error);
  }
};

// 이야기 목록 조회 (user_id 기준)
export const getStoryList = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return res.status(400).json({ error: 'user_id는 필수입니다.' });

    const stories = await Story.findAll({
      where: { user_id: parseInt(user_id) },
      include: [{ association: 'image', attributes: ['image_url'] }],
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
    next(error);
  }
};

// 이야기 상세 조회 (story_id 기준) - audio_url 포함
export const getStoryDetail = async (req, res, next) => {
  try {
    const { story_id } = req.params;
    if (!story_id) return res.status(400).json({ error: 'story_id는 필수입니다.' });

    const story = await Story.findOne({
      where: { story_id: parseInt(story_id) },
      include: [{ association: 'image', attributes: ['image_url'] }],
      attributes: ['story_id', 'story_name', 'story_content', 'audio_url', 'created_at'],
    });

    if (!story) return res.status(404).json({ error: '이야기를 찾을 수 없습니다.' });

    res.json({
      story_id: story.story_id,
      story_name: story.story_name,
      story_content: story.story_content,
      image_url: story.image?.image_url ?? null,
      audio_url: story.audio_url ?? null,
      created_at: story.created_at,
    });
  } catch (error) {
    next(error);
  }
};

// TTS 미리듣기 (저장 없이 스트리밍)
export const ttsPreview = async (req, res, next) => {
  try {
    const { story_content, voice_gender = 'FEMALE' } = req.body;
    if (!story_content) return res.status(400).json({ error: 'story_content는 필수입니다.' });

    const previewText = story_content.slice(0, 150);
    const audioBuffer = await synthesizeSpeechPreview(previewText, voice_gender);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-store',
    });

    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
};

// 이야기 + 이미지 + 음성 삭제
export const deleteStory = async (req, res, next) => {
  try {
    const { story_id } = req.params;
    const user_id = req.user.user_id;

    if (!story_id) return res.status(400).json({ error: 'story_id는 필수입니다.' });

    // 본인 소유 확인
    const story = await Story.findOne({
      where: { story_id: parseInt(story_id), user_id },
      include: [{ association: 'image' }],
    });

    if (!story) return res.status(404).json({ error: '이야기를 찾을 수 없습니다.' });

    const filename = story.filename;
    const image_id = story.image_id;

     // 1. Story DB 삭제
    await story.destroy();

    // 2. Image DB 삭제
    await Image.destroy({ where: { image_id } });

    // 3. 이미지 파일 삭제
    const imagePath = path.join(config.UPLOAD_DIRECTORY, filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // 4. TTS 음성 파일 삭제 (이미지와 동일한 기본 파일명으로 .mp3)
    deleteAudioFile(filename);

    console.log(`삭제 완료 - story_id: ${story_id}, filename: ${filename}`);
    res.json({ message: '이야기가 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
};