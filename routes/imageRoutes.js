// routes/imageRoutes.js
const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");

router.post("/image-upload", imageController.uploadMiddleware, imageController.uploadImage);
router.post("/story-save", imageController.uploadMiddleware, imageController.saveStory);

module.exports = router;