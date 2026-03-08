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

// 업로드 디렉토리 초기화
const uploadDir = path.join(__dirname, '..', config.UPLOAD_DIRECTORY);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const audioDir = path.join(__dirname, '..', config.AUDIO_DIRECTORY);
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

// diskStorage - 로컬 디스크에 파일 저장
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

export const uploadMiddleware = upload.single('file');

// ── 컨트롤러 ──────────────────────────────────────────────

// 이미지 업로드 + 이야기 생성만 처리 (DB 저장 없음)
export const uploadImage = async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    const file = req.file;
    const { user_id } = req.body;

    if (!file) return res.status(400).json({ error: '파일 업로드 실패' });
    if (!user_id) return res.status(400).json({ error: 'user_id는 필수입니다.' });

    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString('base64');
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

    // 생성만 하고 저장하지 않으므로 임시 파일 삭제
    fs.unlink(filePath, () => {});

    res.json({
      story_name: titleMatch[1],
      story_content: contentMatch[1],
      original_filename: file.originalname,
    });
  } catch (error) {
    // 에러 시 임시 파일 정리
    if (filePath) fs.unlink(filePath, () => {});
    next(error);
  }
};

// 사용자가 확인 후 저장 확정 시 처리
export const saveStory = async (req, res, next) => {
  let savedFilePath = null;

  try {
    const file = req.file;
    const { user_id, story_name, story_content, voice_gender = 'FEMALE' } = req.body;

    if (!file) return res.status(400).json({ error: '파일 업로드 실패' });
    if (!user_id || !story_name || !story_content) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    savedFilePath = file.path;
    const filename = file.filename;
    const image_url = `${config.BASE_URL}/${config.UPLOAD_DIRECTORY}/${filename}`;

    // 1. 이미지 DB 저장
    const image = await Image.create({
      user_id: parseInt(user_id),
      original_filename: filename,
      image_url,
      image_description: '',
    });

    // 2. TTS 음성 생성 → 로컬 저장
    //    실패해도 동화 저장은 계속 진행 (audio_url은 null로 저장)
    let audio_url = null;
    try {
      audio_url = await synthesizeSpeech(story_content, filename, voice_gender);
      console.log(`TTS 생성 완료: ${audio_url}`);
    } catch (ttsError) {
      console.error('TTS 생성 실패 (동화 저장은 계속 진행):', ttsError.message);
    }

    // 3. 이야기 DB 저장
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
    // 저장 도중 에러 발생 시 이미 저장된 로컬 이미지 파일 롤백
    if (savedFilePath) {
      fs.unlink(savedFilePath, () => {});
      console.log(`롤백: 로컬 이미지 삭제 완료 (${savedFilePath})`);
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
    const audioFilename = `${path.parse(filename).name}.mp3`;

    // 1. Story DB 삭제
    await story.destroy();

    // 2. Image DB 삭제
    await Image.destroy({ where: { image_id } });

    // 3. 로컬 이미지 파일 삭제
    const imagePath = path.join(uploadDir, filename);
    fs.unlink(imagePath, (err) => {
      if (err) console.error(`이미지 파일 삭제 실패: ${imagePath}`, err.message);
    });

    // 4. 로컬 오디오 파일 삭제
    deleteAudioFile(audioFilename);

    console.log(`삭제 완료 - story_id: ${story_id}, filename: ${filename}`);
    res.json({ message: '이야기가 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
};