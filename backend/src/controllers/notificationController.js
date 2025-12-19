import sequelize from '../config/db.js';
import { Notification, User } from '../models/index.js';
import { Op } from 'sequelize';
import { col } from 'sequelize';

/**
 * GET /api/notifications
 * Get user's notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { is_read, type, limit = 50 } = req.query;

    const where = {
      user_id: req.user.id
    };

    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }

    if (type) {
      where.type = type;
    }

    const notifications = await Notification.findAll({
      where,
      order: [[col('Notification.created_at'), 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    });

    // Get unread count
    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all user's notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    res.json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};
