// routes/imageRoutes.js
const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");

router.post("/image-upload", imageController.uploadMiddleware, imageController.uploadImage);

module.exports = router;