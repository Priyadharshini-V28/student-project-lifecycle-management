import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { getNotificationsQuerySchema } from '../validators/notification.validator';

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const validatedQuery = getNotificationsQuerySchema.parse(req.query);

    const result = await notificationService.getUserNotifications(req.user.id, validatedQuery);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Unread notification count retrieved',
      data: { unreadCount },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = String(req.params.id);

    const notification = await notificationService.markNotificationAsRead(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const result = await notificationService.markAllNotificationsAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
