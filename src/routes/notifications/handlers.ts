import type { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import { ADMIN_BROADCASTABLE_NOTIFICATION_TYPES } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import db from '../../models';
import NotificationsPolicy from '../../policies/notifications';
import { currentUserId } from '../../services/currentUser';
import {
  createGlobalNotification,
  getNotifications,
  updateNotificationState,
} from '../../services/notifications';
import { userById } from '../../services/users';

const { Notification } = db;

const namespace = 'HANDLERS:NOTIFICATIONS';

const logContext = {
  namespace,
};

export async function getArchivedNotificationsHandler(req: Request, res: Response) {
  try {
    const { limit, sortBy, sortDir, offset } = req.query;

    const userId = await currentUserId(req, res);

    const notifications = await getNotifications(userId, [], {
      limit: limit ? Number(limit) : undefined,
      sortBy: typeof sortBy === 'string' ? sortBy : undefined,
      sortDir: typeof sortDir === 'string' ? sortDir : undefined,
      offset: offset ? Number(offset) : undefined,
      archived: true,
    });

    res.status(StatusCodes.OK).json(notifications);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getNotificationsHandler(req: Request, res: Response) {
  try {
    const { limit, sortBy, sortDir, offset } = req.query;

    const userId = await currentUserId(req, res);

    const notifications = await getNotifications(userId, [], {
      limit: limit ? Number(limit) : undefined,
      sortBy: typeof sortBy === 'string' ? sortBy : undefined,
      sortDir: typeof sortDir === 'string' ? sortDir : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.status(StatusCodes.OK).json(notifications);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function updateNotificationHandler(req: Request, res: Response) {
  try {
    const notificationId = Number(req.params.notificationId);
    const updatedNotification = req.body;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Notification not found' });
    }

    const policy = new NotificationsPolicy(user, notification);

    if (!policy.canUpdateNotification()) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: 'User does not have permission to update this notification' });
    }

    // Prevent writing state for notifications owned by another user
    if (notification.userId !== null && notification.userId !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: 'User does not have permission to update this notification' });
    }

    const updated = await updateNotificationState(notification.id, userId, updatedNotification);

    return res.status(StatusCodes.OK).json(updated);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createGlobalNotificationHandler(req: Request, res: Response) {
  // admin access is checked in the middleware
  try {
    const notificationData = req.body;
    const { type, triggeredAt } = notificationData;

    if (!type || !ADMIN_BROADCASTABLE_NOTIFICATION_TYPES.includes(type)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Invalid notification type. Must be one of: ${ADMIN_BROADCASTABLE_NOTIFICATION_TYPES.join(', ')}`,
      });
    }

    let parsedTriggeredAt: Date | undefined;
    if (triggeredAt !== undefined && triggeredAt !== null) {
      parsedTriggeredAt = new Date(triggeredAt);
      if (Number.isNaN(parsedTriggeredAt.getTime())) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid triggeredAt date' });
      }
    }

    const notification = await createGlobalNotification(type, {
      metadata: {
        id: notificationData.id ?? undefined,
        recipientName: notificationData.text ?? undefined,
        userName: notificationData.text ?? undefined,
        date: parsedTriggeredAt?.toISOString(),
        displayId: notificationData.displayId ?? undefined,
      },
    });
    res.status(StatusCodes.CREATED).json(notification);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
