// controllers/authController.js
const { User } = require("../models");

exports.checkDuplicate = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ where: { username } });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(400).json({ error: "아이디 또는 비밀번호가 잘못되었습니다." });
    }
    res.json({ user_id: user.user_id, name: user.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.signup = async (req, res) => {
  try {
    const { username, name, password, email } = req.body;
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Username already registered" });
    }
    const newUser = await User.create({ username, name, password, email });
    res.json({ user_id: newUser.user_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};