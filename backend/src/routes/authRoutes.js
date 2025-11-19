import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;

