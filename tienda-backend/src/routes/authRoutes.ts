import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/authController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

// /api/auth/register
router.post('/register', register);

// /api/auth/login
router.post('/login', login);

// /api/auth/profile
router.put('/profile', verifyToken, updateProfile);

export default router;