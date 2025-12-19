import express from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get user's notifications
router.get('/', getNotifications);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', markAsRead);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', markAllAsRead);

export default router;
