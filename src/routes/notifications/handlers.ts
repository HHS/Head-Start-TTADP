import type { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import handleErrors from '../../lib/apiErrorHandler';
import db from '../../models';
import NotificationsPolicy from '../../policies/notifications';
import { currentUserId } from '../../services/currentUser';
import {
  createGlobalNotification,
  getNotifications,
  updateNotification,
} from '../../services/notifications';
import { userById } from '../../services/users';

const { Notification } = db;

const namespace = 'HANDLERS:NOTIFICATIONS';

const logContext = {
  namespace,
};

export async function getNotificationsHandler(req: Request, res: Response) {
  try {
    const { limit, sortBy, sortDirection, offset } = req.query;

    const userId = await currentUserId(req, res);

    const notifications = await getNotifications(
      [
        {
          userId,
          archivedAt: null,
        },
      ],
      {
        limit: limit ? Number(limit) : undefined,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortDirection: typeof sortDirection === 'string' ? sortDirection : undefined,
        offset: offset ? Number(offset) : undefined,
      }
    );

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

    const updated = await updateNotification(notification, updatedNotification);

    return res.status(StatusCodes.OK).json(updated);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createGlobalNotificationHandler(req: Request, res: Response) {
  // admin access is checked in the middleware
  try {
    const notificationData = req.body;
    const notification = await createGlobalNotification(notificationData.type, {
      metadata: {
        id: notificationData.id ?? undefined,
        recipientName: notificationData.text ?? undefined,
        userName: notificationData.text ?? undefined,
        date: notificationData.triggeredAt
          ? new Date(notificationData.triggeredAt).toISOString()
          : undefined,
        displayId: notificationData.displayId ?? undefined,
      },
    });
    res.status(StatusCodes.CREATED).json(notification);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
