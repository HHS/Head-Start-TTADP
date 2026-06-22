import type { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import { NOTIFICATION_TYPES } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import db from '../../models';
import * as currentUserService from '../../services/currentUser';
import * as notificationsService from '../../services/notifications';
import * as usersService from '../../services/users';
import {
  createGlobalNotificationHandler,
  getArchivedNotificationsHandler,
  getNotificationsHandler,
  updateNotificationHandler,
} from './handlers';

jest.mock('../../services/notifications');
jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../models', () => ({
  Notification: { findByPk: jest.fn() },
}));

const { Notification } = db;

const logContext = { namespace: 'HANDLERS:NOTIFICATIONS' };

describe('notification handlers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRequest = { query: {}, params: {}, body: {} };
    mockResponse = { status: mockStatus, json: mockJson };
    jest.clearAllMocks();
  });

  describe('getNotificationsHandler', () => {
    it('returns notifications for the current user with default options', async () => {
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      const mockNotifications = [{ id: 1 }, { id: 2 }];
      (notificationsService.getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      mockRequest.query = {};

      await getNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(42, [], {
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        offset: undefined,
      });
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(mockNotifications);
    });

    it('passes pagination and sort options from query params', async () => {
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      (notificationsService.getNotifications as jest.Mock).mockResolvedValue([]);

      mockRequest.query = {
        limit: '5',
        offset: '10',
        sortBy: 'action_needed',
        sortDir: 'ASC',
      };

      await getNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(42, [], {
        limit: 5,
        sortBy: 'action_needed',
        sortDir: 'ASC',
        offset: 10,
      });
    });

    it('calls handleErrors when an error is thrown', async () => {
      const error = new Error('service error');
      (currentUserService.currentUserId as jest.Mock).mockRejectedValue(error);

      await getNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, logContext);
    });
  });

  describe('updateNotificationHandler', () => {
    const mockUser = { id: 42, permissions: [] };
    const mockNotification = { id: 1, userId: 42 };

    beforeEach(() => {
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      (usersService.userById as jest.Mock).mockResolvedValue(mockUser);
    });

    it('returns 404 when notification is not found', async () => {
      (Notification.findByPk as jest.Mock).mockResolvedValue(null);
      mockRequest.params = { notificationId: '999' };
      mockRequest.body = {};

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('returns 403 when user does not have permission', async () => {
      const otherNotification = { id: 1, userId: 99 };
      (Notification.findByPk as jest.Mock).mockResolvedValue(otherNotification);
      mockRequest.params = { notificationId: '1' };
      mockRequest.body = {};

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User does not have permission to update this notification',
      });
    });

    it('returns 403 when admin tries to update a notification owned by another user', async () => {
      const adminUser = {
        id: 42,
        permissions: [{ regionId: 1, scopeId: SCOPES.ADMIN }],
      };
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      (usersService.userById as jest.Mock).mockResolvedValue(adminUser);

      const otherUserNotification = { id: 5, userId: 99 };
      (Notification.findByPk as jest.Mock).mockResolvedValue(otherUserNotification);

      mockRequest.params = { notificationId: '5' };
      mockRequest.body = { viewedAt: '2026-01-01' };

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User does not have permission to update this notification',
      });
    });

    it('returns 200 with updated notification state on success', async () => {
      (Notification.findByPk as jest.Mock).mockResolvedValue(mockNotification);
      const updatedData = { archivedAt: '2026-01-01' };
      const updatedResult = { id: 10, notificationId: 1, userId: 42, ...updatedData };
      (notificationsService.updateNotificationState as jest.Mock).mockResolvedValue(updatedResult);

      mockRequest.params = { notificationId: '1' };
      mockRequest.body = updatedData;

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.updateNotificationState).toHaveBeenCalledWith(1, 42, updatedData);
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(updatedResult);
    });

    it('returns 200 with updated state for a global notification', async () => {
      const globalNotification = { id: 2, userId: null };
      (Notification.findByPk as jest.Mock).mockResolvedValue(globalNotification);
      const updatedData = { viewedAt: '2026-01-01' };
      const updatedResult = { id: 10, notificationId: 2, userId: 42, ...updatedData };
      (notificationsService.updateNotificationState as jest.Mock).mockResolvedValue(updatedResult);

      mockRequest.params = { notificationId: '2' };
      mockRequest.body = updatedData;

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.updateNotificationState).toHaveBeenCalledWith(2, 42, updatedData);
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(updatedResult);
    });

    it('calls handleErrors when an error is thrown', async () => {
      const error = new Error('db error');
      (currentUserService.currentUserId as jest.Mock).mockRejectedValue(error);
      mockRequest.params = { notificationId: '1' };
      mockRequest.body = {};

      await updateNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, logContext);
    });
  });

  describe('createGlobalNotificationHandler', () => {
    it('returns 201 with the created notification', async () => {
      const notificationData = {
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
        id: 123,
        text: 'System Update',
        triggeredAt: '2026-06-01T00:00:00.000Z',
        displayId: 'SYS-001',
      };
      const createdNotification = { id: 1, type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE };
      (notificationsService.createGlobalNotification as jest.Mock).mockResolvedValue(
        createdNotification
      );

      mockRequest.body = notificationData;

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.createGlobalNotification).toHaveBeenCalledWith(
        notificationData.type,
        {
          metadata: {
            id: 123,
            recipientName: 'System Update',
            userName: 'System Update',
            date: notificationData.triggeredAt,
            displayId: 'SYS-001',
          },
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockJson).toHaveBeenCalledWith(createdNotification);
    });

    it('handles null optional fields gracefully', async () => {
      const notificationData = { type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE };
      const createdNotification = { id: 2, type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE };
      (notificationsService.createGlobalNotification as jest.Mock).mockResolvedValue(
        createdNotification
      );

      mockRequest.body = notificationData;

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.createGlobalNotification).toHaveBeenCalledWith(
        notificationData.type,
        {
          metadata: {
            id: undefined,
            recipientName: undefined,
            userName: undefined,
            date: undefined,
            displayId: undefined,
          },
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('returns 400 when type is missing', async () => {
      mockRequest.body = { triggeredAt: '2026-06-01T00:00:00.000Z' };

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid notification type') })
      );
    });

    it('returns 400 when type is not in the admin whitelist', async () => {
      mockRequest.body = { type: 'changesRequested' };

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Invalid notification type') })
      );
    });

    it('returns 400 when triggeredAt is not a valid date', async () => {
      mockRequest.body = {
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
        triggeredAt: 'not-a-date',
      };

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Invalid triggeredAt date' });
    });

    it('calls handleErrors when an error is thrown', async () => {
      const error = new Error('creation failed');
      (notificationsService.createGlobalNotification as jest.Mock).mockRejectedValue(error);

      mockRequest.body = { type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE };

      await createGlobalNotificationHandler(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, logContext);
    });
  });

  describe('getArchivedNotificationsHandler', () => {
    it('returns archived notifications for the current user with default options', async () => {
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      const mockNotifications = [{ id: 1 }, { id: 2 }];
      (notificationsService.getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      mockRequest.query = {};

      await getArchivedNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(42, [], {
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        offset: undefined,
        archived: true,
      });
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(mockNotifications);
    });

    it('passes pagination and sort options from query params', async () => {
      (currentUserService.currentUserId as jest.Mock).mockResolvedValue(42);
      (notificationsService.getNotifications as jest.Mock).mockResolvedValue([]);

      mockRequest.query = {
        limit: '5',
        offset: '10',
        sortBy: 'all',
        sortDir: 'ASC',
      };

      await getArchivedNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(42, [], {
        limit: 5,
        sortBy: 'all',
        sortDir: 'ASC',
        offset: 10,
        archived: true,
      });
    });

    it('calls handleErrors when an error is thrown', async () => {
      const error = new Error('service error');
      (currentUserService.currentUserId as jest.Mock).mockRejectedValue(error);

      await getArchivedNotificationsHandler(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, logContext);
    });
  });
});
