const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const authMiddleware = require("../middlewares/authmiddleware");

// 인증이 필요한 라우트에 authMiddleware 적용
router.post("/image-upload", authMiddleware, imageController.uploadMiddleware, imageController.uploadImage);
router.post("/story-save", authMiddleware, imageController.uploadMiddleware, imageController.saveStory);
router.get("/stories/:user_id", authMiddleware, imageController.getStoryList);
router.get("/story/:story_id", authMiddleware, imageController.getStoryDetail);

module.exports = router;