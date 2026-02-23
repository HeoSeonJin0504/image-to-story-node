import { Router } from 'express';
import * as imageController from '../controllers/imageController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  globalStoryLimiter,
  globalTtsLimiter,
  storyGenerateLimiter,
  ttsPreviewLimiter,
  storySaveLimiter,
} from '../middlewares/rateLimit.js';

const router = Router();

router.post('/image-upload', authMiddleware, globalStoryLimiter, storyGenerateLimiter, imageController.uploadMiddleware, imageController.uploadImage);
router.post('/story-save',   authMiddleware, globalStoryLimiter, storySaveLimiter,     imageController.uploadMiddleware, imageController.saveStory);
router.get('/stories/:user_id', authMiddleware, imageController.getStoryList);
router.get('/story/:story_id',  authMiddleware, imageController.getStoryDetail);
router.post('/tts-preview',  authMiddleware, globalTtsLimiter,   ttsPreviewLimiter,   imageController.ttsPreview);
router.delete('/story/:story_id', authMiddleware, imageController.deleteStory);

export default router;