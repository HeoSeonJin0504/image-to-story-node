const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const authMiddleware = require("../middlewares/authMiddleware");
const { storyGenerateLimiter, ttsPreviewLimiter, storySaveLimiter } = require("../middlewares/rateLimit");

// 인증이 필요한 라우트에만 authMiddleware 적용
router.post("/image-upload", authMiddleware, storyGenerateLimiter, imageController.uploadMiddleware, imageController.uploadImage);
router.post("/story-save", authMiddleware, storySaveLimiter, imageController.uploadMiddleware, imageController.saveStory);
router.get("/stories/:user_id", authMiddleware, imageController.getStoryList);
router.get("/story/:story_id", authMiddleware, imageController.getStoryDetail);
router.post("/tts-preview", authMiddleware, ttsPreviewLimiter, imageController.ttsPreview);
router.delete("/story/:story_id", authMiddleware, imageController.deleteStory);

module.exports = router;