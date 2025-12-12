// controllers/authController.js
const { User } = require("../models");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

exports.checkDuplicate = async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "username은 필수입니다." });
    }
    
    const user = await User.findOne({ where: { username } });
    res.json({ exists: !!user });
  } catch (error) {
    console.error("중복 확인 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });
    }
    
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      return res.status(400).json({ error: "아이디 또는 비밀번호가 잘못되었습니다." });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: "아이디 또는 비밀번호가 잘못되었습니다." });
    }
    
    res.json({ user_id: user.user_id, name: user.name });
  } catch (error) {
    console.error("로그인 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

exports.signup = async (req, res) => {
  try {
    const { username, name, password, email } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: "필수 정보를 입력해주세요." });
    }
    
    const existingUser = await User.findOne({ where: { username } });
    
    if (existingUser) {
      return res.status(400).json({ error: "이미 사용 중인 아이디입니다." });
    }
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const newUser = await User.create({ 
      username, 
      name, 
      password: hashedPassword, 
      email 
    });
    
    res.json({ user_id: newUser.user_id });
  } catch (error) {
    console.error("회원가입 에러:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};