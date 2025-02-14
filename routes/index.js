// routes/index.js
const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const imageRoutes = require("./imageRoutes");

router.use("/", authRoutes);
router.use("/", imageRoutes);

module.exports = router;