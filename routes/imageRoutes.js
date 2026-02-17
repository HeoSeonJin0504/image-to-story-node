// routes/imageRoutes.js
const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");

router.post("/image-upload", imageController.uploadMiddleware, imageController.uploadImage);
router.post("/story-save", imageController.uploadMiddleware, imageController.saveStory);
router.get("/stories/:user_id", imageController.getStoryList);
router.get("/story/:story_id", imageController.getStoryDetail);

module.exports = router;