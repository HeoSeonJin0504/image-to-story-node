import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { detectStoryWithChatGPT } from '../services/openaiService.js';
import { synthesizeSpeechPreview } from '../services/ttsService.js';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데모 이미지 경로: /images/demo.jpg (서버에 미리 배치)
const DEMO_IMAGE_PATH = path.join(__dirname, '..', config.UPLOAD_DIRECTORY, 'demo.png');
const DEMO_IMAGE_MIME = 'image/png';

// 데모 동화 생성 (인증 불필요, DB 저장 없음)
export const demoGenerate = async (req, res, next) => {
  try {
    if (!fs.existsSync(DEMO_IMAGE_PATH)) {
      return res.status(503).json({ error: '데모 이미지가 준비되지 않았습니다.' });
    }

    const fileBuffer = fs.readFileSync(DEMO_IMAGE_PATH);
    const base64Image = fileBuffer.toString('base64');

    const storyStr = await detectStoryWithChatGPT(base64Image, DEMO_IMAGE_MIME);

    if (!storyStr || typeof storyStr !== 'string') {
      return res.status(500).json({ error: '동화 생성에 실패했습니다.' });
    }

    const titleMatch = storyStr.match(/동화 제목:\s*'([^']+)'/);
    const contentMatch = storyStr.match(/동화 내용:\s*'([\s\S]+)'/);

    if (!titleMatch || !contentMatch) {
      return res.status(500).json({ error: '동화 형식 파싱에 실패했습니다.' });
    }

    const image_url = `${config.BASE_URL}/${config.UPLOAD_DIRECTORY}/demo.png`;

    res.json({
      story_name: titleMatch[1],
      story_content: contentMatch[1],
      image_url,
    });
  } catch (error) {
    next(error);
  }
};

// 데모 TTS 미리듣기 (인증 불필요)
export const demoTtsPreview = async (req, res, next) => {
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