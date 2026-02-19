const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  globalStoryLimiter,
  globalTtsLimiter,
  storyGenerateLimiter,
  ttsPreviewLimiter,
  storySaveLimiter,
} = require("../middlewares/rateLimit");

// 전역 IP 제한(globalLimiter) → 유저+IP 제한(userLimiter) 순서로 적용
router.post("/image-upload", authMiddleware, globalStoryLimiter, storyGenerateLimiter, imageController.uploadMiddleware, imageController.uploadImage);
router.post("/story-save",   authMiddleware, globalStoryLimiter, storySaveLimiter,     imageController.uploadMiddleware, imageController.saveStory);
router.get("/stories/:user_id", authMiddleware, imageController.getStoryList);
router.get("/story/:story_id",  authMiddleware, imageController.getStoryDetail);
router.post("/tts-preview",  authMiddleware, globalTtsLimiter,   ttsPreviewLimiter,   imageController.ttsPreview);
router.delete("/story/:story_id", authMiddleware, imageController.deleteStory);

module.exports = router;