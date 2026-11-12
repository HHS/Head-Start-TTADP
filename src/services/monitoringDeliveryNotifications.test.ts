import {
  EMAIL_ACTIONS,
  NOTIFICATION_CONFIGURATION,
  NOTIFICATION_TYPES,
  USER_SETTINGS,
} from '../constants';
import { monitoringDetailsAddedNotification } from '../lib/mailer';
import db from '../models';
import {
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
  findPendingMonitoringDeliveries,
  markMonitoringDeliveriesNotified,
  snapshotDeliveredReviewMrids,
} from './monitoringDeliveries';
import {
  ACTIONABLE_NOTIFICATIONS_FLAG,
  createMonitoringDataReceivedNotifications,
  notifyNewMonitoringDeliveries,
  notifyRecentMonitoringDeliveries,
  recordMonitoringDeliveries,
  usersWantingImmediateMonitoringEmail,
} from './monitoringDeliveryNotifications';
import { createNotification } from './notifications';
import { usersWithSetting } from './userSettings';

jest.mock('./monitoringDeliveries', () => ({
  ACTIONABLE_NOTIFICATIONS_FLAG: 'actionable_notifications',
  findNewlyDeliveredReviews: jest.fn(),
  findMonitoringNotificationUsersByRegion: jest.fn(),
  findPendingMonitoringDeliveries: jest.fn(),
  markMonitoringDeliveriesNotified: jest.fn(),
  snapshotDeliveredReviewMrids: jest.fn(),
}));

jest.mock('./notifications', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../lib/mailer', () => ({
  monitoringDetailsAddedNotification: jest.fn(),
}));

jest.mock('./userSettings', () => ({
  usersWithSetting: jest.fn(),
}));

const mockEmailTrigger = monitoringDetailsAddedNotification as jest.MockedFunction<
  typeof monitoringDetailsAddedNotification
>;
const mockUsersWithSetting = usersWithSetting as jest.MockedFunction<typeof usersWithSetting>;
const mockFindPending = findPendingMonitoringDeliveries as jest.MockedFunction<
  typeof findPendingMonitoringDeliveries
>;
const mockMarkNotified = markMonitoringDeliveriesNotified as jest.MockedFunction<
  typeof markMonitoringDeliveriesNotified
>;
const { IMMEDIATELY } = USER_SETTINGS.EMAIL.VALUES;

const mockFindNew = findNewlyDeliveredReviews as jest.MockedFunction<
  typeof findNewlyDeliveredReviews
>;
const mockFindUsers = findMonitoringNotificationUsersByRegion as jest.MockedFunction<
  typeof findMonitoringNotificationUsersByRegion
>;
const mockCreateNotification = createNotification as jest.MockedFunction<typeof createNotification>;

const deliveryA = {
  deliveredReviewId: 1,
  mrid: 100,
  reportDeliveryDate: '2026-11-10',
  recipientId: 500,
  recipientName: 'Recipient A',
  regionId: 1,
  grantIds: [10],
};
const deliveryB = { ...deliveryA, recipientId: 600, recipientName: 'Recipient B', regionId: 2 };

// what findPendingMonitoringDeliveries returns for a recorded delivery
const pending = (delivery: typeof deliveryA, monitoringDeliveryId: number) => ({
  monitoringDeliveryId,
  deliveredReviewId: delivery.deliveredReviewId,
  recipientId: delivery.recipientId,
  recipientName: delivery.recipientName,
  regionId: delivery.regionId,
});
const pendingA = pending(deliveryA, 1001);
const pendingB = pending(deliveryB, 1002);

const user1 = { id: 11, name: 'One', email: 'one@example.com', homeRegionId: 1 };
const user2 = { id: 12, name: 'Two', email: 'two@example.com', homeRegionId: 1 };
const user3 = { id: 13, name: 'Three', email: 'three@example.com', homeRegionId: 2 };

describe('monitoringDeliveryNotifications', () => {
  let findOrCreateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreateSpy = jest
      .spyOn(db.MonitoringReportDelivery, 'findOrCreate')
      .mockResolvedValue([{ id: 1001 }, true]);
    mockCreateNotification.mockResolvedValue({ id: 1 } as never);
    // default: nobody has opted into email (the setting default is "never")
    mockUsersWithSetting.mockResolvedValue([]);
    mockFindPending.mockResolvedValue([]);
    mockEmailTrigger.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NOTIFICATION_CONFIGURATION entry', () => {
    const config = NOTIFICATION_CONFIGURATION[
      NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED
    ] as unknown as {
      textFn: (metadata: object) => string;
      linkFn: (metadata: object) => string;
      linkText: (metadata: object) => string;
      actionable: boolean;
      settingsKey: string;
    };
    const metadata = { recipientName: 'Recipient A', recipientId: 500, regionId: 1 };

    it('builds the text, RTR monitoring link and CTA', () => {
      expect(config.textFn(metadata)).toBe('A new monitoring report for Recipient A is available.');
      expect(config.linkFn(metadata)).toBe('/recipient-tta-records/500/region/1/monitoring');
      expect(config.linkText(metadata)).toBe('View details');
      expect(config.actionable).toBe(false);
      expect(config.settingsKey).toBe('inAppWhenMonitoringDetailsAdded');
    });
  });

  describe('recordMonitoringDeliveries', () => {
    it('returns every delivery with its row id, flagging the ones it created', async () => {
      findOrCreateSpy
        .mockResolvedValueOnce([{ id: 1001 }, true])
        .mockResolvedValueOnce([{ id: 1002 }, false]);

      const result = await recordMonitoringDeliveries([deliveryA, deliveryB]);

      expect(result).toEqual([
        { ...deliveryA, monitoringDeliveryId: 1001, created: true },
        { ...deliveryB, monitoringDeliveryId: 1002, created: false },
      ]);
      // region is part of the key: one review can cover a recipient's grants in two regions
      expect(findOrCreateSpy).toHaveBeenCalledWith({
        where: { deliveredReviewId: 1, recipientId: 500, regionId: 1 },
      });
    });
  });

  describe('createMonitoringDataReceivedNotifications', () => {
    it('creates one notification per user keyed on the monitoring delivery', async () => {
      const result = await createMonitoringDataReceivedNotifications(pendingA, [user1, user2]);

      expect(result).toEqual({ count: 2, failed: 0 });
      expect(mockCreateNotification).toHaveBeenCalledWith(
        11,
        1001,
        NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
        { metadata: { recipientName: 'Recipient A', recipientId: 500, regionId: 1 } }
      );
    });

    it('does not count users who opted out and keeps going after an error', async () => {
      mockCreateNotification.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(null);

      const result = await createMonitoringDataReceivedNotifications(pendingA, [user1, user2]);

      expect(result).toEqual({ count: 0, failed: 1 });
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyNewMonitoringDeliveries', () => {
    it('skips everything when the pre-refresh snapshot is empty', async () => {
      const summary = await notifyNewMonitoringDeliveries(new Set());

      expect(summary).toEqual({ detected: 0, recorded: 0, inApp: 0, emails: 0 });
      expect(mockFindNew).not.toHaveBeenCalled();
      expect(findOrCreateSpy).not.toHaveBeenCalled();
      expect(mockFindPending).not.toHaveBeenCalled();
    });

    it('notifies flagged users in each pending delivery’s home region only', async () => {
      mockFindNew.mockResolvedValue([deliveryA, deliveryB]);
      mockFindPending.mockResolvedValue([pendingA, pendingB]);
      mockFindUsers.mockResolvedValue(
        new Map([
          [1, [user1, user2]],
          [2, [user3]],
        ])
      );

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      expect(mockFindUsers).toHaveBeenCalledWith([1, 2], ACTIONABLE_NOTIFICATIONS_FLAG);
      const calls = mockCreateNotification.mock.calls.map(([userId, entityId, , { metadata }]) => [
        userId,
        entityId,
        metadata.recipientName,
      ]);
      expect(calls).toEqual([
        [11, 1001, 'Recipient A'],
        [12, 1001, 'Recipient A'],
        [13, 1002, 'Recipient B'],
      ]);
      expect(summary).toEqual({ detected: 2, recorded: 2, inApp: 3, emails: 0 });
      expect(mockMarkNotified).toHaveBeenCalledWith([1001, 1002]);
    });

    it('does not count deliveries that were already recorded', async () => {
      mockFindNew.mockResolvedValue([deliveryA]);
      findOrCreateSpy.mockResolvedValue([{ id: 1001 }, false]);

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      expect(summary).toEqual({ detected: 1, recorded: 0, inApp: 0, emails: 0 });
      expect(mockFindUsers).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
      expect(mockEmailTrigger).not.toHaveBeenCalled();
    });

    it('retries deliveries an earlier run left pending', async () => {
      mockFindNew.mockResolvedValue([]);
      mockFindPending.mockResolvedValue([pendingA]);
      mockFindUsers.mockResolvedValue(new Map([[1, [user1]]]));

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      expect(summary).toEqual({ detected: 0, recorded: 0, inApp: 1, emails: 0 });
      expect(mockMarkNotified).toHaveBeenCalledWith([1001]);
    });

    it('leaves a delivery pending, without emailing, when an in-app notification fails', async () => {
      mockFindPending.mockResolvedValue([pendingA, pendingB]);
      mockFindNew.mockResolvedValue([]);
      mockFindUsers.mockResolvedValue(
        new Map([
          [1, [user1]],
          [2, [user3]],
        ])
      );
      mockUsersWithSetting.mockResolvedValue([user1, user3] as never);
      mockCreateNotification.mockRejectedValueOnce(new Error('boom'));

      await notifyNewMonitoringDeliveries(new Set([99]));

      expect(mockEmailTrigger).toHaveBeenCalledTimes(1);
      expect(mockEmailTrigger).toHaveBeenCalledWith(pendingB, [user3]);
      expect(mockMarkNotified).toHaveBeenCalledWith([1002]);
    });

    it('leaves a delivery pending when its emails cannot be queued', async () => {
      mockFindPending.mockResolvedValue([pendingA, pendingB]);
      mockFindNew.mockResolvedValue([]);
      mockFindUsers.mockResolvedValue(
        new Map([
          [1, [user1]],
          [2, [user3]],
        ])
      );
      mockEmailTrigger.mockRejectedValueOnce(new Error('redis down'));

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      expect(mockMarkNotified).toHaveBeenCalledWith([1002]);
      expect(summary.inApp).toBe(2);
    });

    it('leaves everything pending when the audience lookup fails', async () => {
      mockFindNew.mockResolvedValue([deliveryA]);
      mockFindPending.mockResolvedValue([pendingA]);
      mockFindUsers.mockRejectedValue(new Error('db down'));

      await expect(notifyNewMonitoringDeliveries(new Set([99]))).rejects.toThrow('db down');
      expect(findOrCreateSpy).toHaveBeenCalled();
      expect(mockMarkNotified).not.toHaveBeenCalled();
    });

    it('emails only users set to "immediately", once per recipient/report', async () => {
      const pendingA2 = { ...pendingA, monitoringDeliveryId: 1003, deliveredReviewId: 2 };
      mockFindNew.mockResolvedValue([]);
      mockFindPending.mockResolvedValue([pendingA, pendingA2, pendingB]);
      mockFindUsers.mockResolvedValue(
        new Map([
          [1, [user1, user2]],
          [2, [user3]],
        ])
      );
      mockUsersWithSetting.mockResolvedValue([user1] as never);

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      // the emails are awaited, so the CLI cannot exit before they are queued
      expect(mockEmailTrigger).toHaveBeenCalledTimes(3);
      expect(mockEmailTrigger).toHaveBeenNthCalledWith(1, pendingA, [user1]);
      expect(mockEmailTrigger).toHaveBeenNthCalledWith(2, pendingA2, [user1]);
      expect(mockEmailTrigger).toHaveBeenNthCalledWith(3, pendingB, []);
      expect(summary.emails).toBe(2);
      // settings are looked up once, not once per delivery or user
      expect(mockUsersWithSetting).toHaveBeenCalledTimes(1);
    });
  });

  describe('usersWantingImmediateMonitoringEmail', () => {
    it('keeps only the given users whose monitoring email setting is "immediately"', async () => {
      // usersWithSetting returns every user in the Hub with the setting, so filter to the audience
      mockUsersWithSetting.mockResolvedValue([user1, { id: 999 }] as never);

      const result = await usersWantingImmediateMonitoringEmail([user1, user2, user3]);

      expect(result).toEqual([user1]);
      expect(mockUsersWithSetting).toHaveBeenCalledWith(EMAIL_ACTIONS.MONITORING_DETAILS_ADDED, [
        IMMEDIATELY,
      ]);
    });

    it('does not query when there are no users', async () => {
      expect(await usersWantingImmediateMonitoringEmail([])).toEqual([]);
      expect(mockUsersWithSetting).not.toHaveBeenCalled();
    });
  });

  describe('notifyRecentMonitoringDeliveries', () => {
    it('treats reviews delivered yesterday or today as new', async () => {
      const mockSnapshot = snapshotDeliveredReviewMrids as jest.MockedFunction<
        typeof snapshotDeliveredReviewMrids
      >;
      mockSnapshot.mockResolvedValue(new Set([99]));
      mockFindNew.mockResolvedValue([]);

      const summary = await notifyRecentMonitoringDeliveries(new Date('2026-11-12T03:00:00Z'));

      expect(mockSnapshot).toHaveBeenCalledWith('2026-11-11');
      expect(mockFindNew).toHaveBeenCalledWith(new Set([99]));
      expect(summary).toEqual({ detected: 0, recorded: 0, inApp: 0, emails: 0 });
    });

    it('sends again for deliveries that were already recorded', async () => {
      (snapshotDeliveredReviewMrids as jest.Mock).mockResolvedValue(new Set());
      mockFindNew.mockResolvedValue([deliveryA]);
      mockFindUsers.mockResolvedValue(new Map([[1, [user1]]]));
      mockUsersWithSetting.mockResolvedValue([user1] as never);
      findOrCreateSpy.mockResolvedValue([{ id: 1001 }, false]);

      const summary = await notifyRecentMonitoringDeliveries();

      expect(mockEmailTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ ...deliveryA, monitoringDeliveryId: 1001 }),
        [user1]
      );
      expect(summary).toEqual({ detected: 1, recorded: 0, inApp: 1, emails: 1 });
      expect(mockMarkNotified).toHaveBeenCalledWith([1001]);
      expect(mockFindPending).not.toHaveBeenCalled();
    });
  });
});
