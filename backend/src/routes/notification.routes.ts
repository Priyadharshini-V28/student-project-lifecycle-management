import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

// All notification endpoints require valid JWT authentication
router.use(authenticate);

// List user notifications with pagination and isRead filter
router.get('/', notificationController.getNotifications);

// Retrieve total unread notifications count for badge
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all notifications for authenticated user as read
router.patch('/read-all', notificationController.markAllAsRead);

// Mark a specific notification as read (with recipient ownership guard)
router.patch('/:id/read', notificationController.markAsRead);

export default router;
