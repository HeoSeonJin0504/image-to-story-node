import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { loginLimiter, signupLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/check-duplicate', authController.checkDuplicate);
router.post('/login', loginLimiter, authController.login);
router.post('/signup', signupLimiter, authController.signup);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;