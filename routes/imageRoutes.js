import { Router } from 'express';
import * as imageController from '../controllers/imageController.js';
import * as demoController from '../controllers/demoController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  globalStoryLimiter,
  globalTtsLimiter,
  storyGenerateLimiter,
  ttsPreviewLimiter,
  storySaveLimiter,
  demoLimiter,
  demoTtsLimiter,
} from '../middlewares/rateLimit.js';

const router = Router();

router.post('/image-upload', authMiddleware, globalStoryLimiter, storyGenerateLimiter, imageController.uploadMiddleware, imageController.uploadImage);
router.post('/story-save',   authMiddleware, globalStoryLimiter, storySaveLimiter,     imageController.uploadMiddleware, imageController.saveStory);
router.get('/stories/:user_id', authMiddleware, imageController.getStoryList);
router.get('/story/:story_id',  authMiddleware, imageController.getStoryDetail);
router.post('/tts-preview',  authMiddleware, globalTtsLimiter,   ttsPreviewLimiter,   imageController.ttsPreview);
router.delete('/story/:story_id', authMiddleware, imageController.deleteStory);

// 데모: 인증 없이 샘플 이미지로 동화 생성 + TTS 미리듣기
// 수정 후
router.post('/demo', authMiddleware, demoLimiter, demoController.demoGenerate);
router.post('/demo-tts-preview', authMiddleware, demoTtsLimiter, demoController.demoTtsPreview);

export default router;