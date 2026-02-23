import { Router } from 'express';
import authRoutes from './authRoutes.js';
import imageRoutes from './imageRoutes.js';

const router = Router();

router.use('/', authRoutes);
router.use('/', imageRoutes);

export default router;