const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { loginLimiter, signupLimiter } = require("../middlewares/rateLimit");

router.post("/check-duplicate", authController.checkDuplicate);
router.post("/login", loginLimiter, authController.login);
router.post("/signup", signupLimiter, authController.signup);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;