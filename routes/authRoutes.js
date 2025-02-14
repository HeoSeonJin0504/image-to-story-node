// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/check-duplicate", authController.checkDuplicate);
router.post("/login", authController.login);
router.post("/signup", authController.signup);

module.exports = router;