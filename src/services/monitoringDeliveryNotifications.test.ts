import { NOTIFICATION_CONFIGURATION, NOTIFICATION_TYPES } from '../constants';
import db from '../models';
import {
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
} from './monitoringDeliveries';
import {
  ACTIONABLE_NOTIFICATIONS_FLAG,
  createMonitoringDataReceivedNotifications,
  notifyNewMonitoringDeliveries,
  recordMonitoringDeliveries,
} from './monitoringDeliveryNotifications';
import { createNotification } from './notifications';

jest.mock('./monitoringDeliveries', () => ({
  findNewlyDeliveredReviews: jest.fn(),
  findMonitoringNotificationUsersByRegion: jest.fn(),
}));

jest.mock('./notifications', () => ({
  createNotification: jest.fn(),
}));

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

const user1 = { id: 11, name: 'One', email: 'one@example.com', homeRegionId: 1 };
const user2 = { id: 12, name: 'Two', email: 'two@example.com', homeRegionId: 1 };
const user3 = { id: 13, name: 'Three', email: 'three@example.com', homeRegionId: 2 };

describe('monitoringDeliveryNotifications', () => {
  let findOrCreateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreateSpy = jest
      .spyOn(db.MonitoringReportDelivery, 'findOrCreate')
      .mockResolvedValue([{}, true]);
    mockCreateNotification.mockResolvedValue({ id: 1 } as never);
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
    it('returns only the deliveries that were not already recorded', async () => {
      findOrCreateSpy.mockResolvedValueOnce([{}, true]).mockResolvedValueOnce([{}, false]);

      const result = await recordMonitoringDeliveries([deliveryA, deliveryB]);

      expect(result).toEqual([deliveryA]);
      expect(findOrCreateSpy).toHaveBeenCalledWith({
        where: { deliveredReviewId: 1, recipientId: 500 },
        defaults: { regionId: 1 },
      });
    });
  });

  describe('createMonitoringDataReceivedNotifications', () => {
    it('creates one notification per user keyed on the delivered review', async () => {
      const count = await createMonitoringDataReceivedNotifications(deliveryA, [user1, user2]);

      expect(count).toBe(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        11,
        1,
        NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
        { metadata: { recipientName: 'Recipient A', recipientId: 500, regionId: 1 } }
      );
    });

    it('does not count users who opted out and keeps going after an error', async () => {
      mockCreateNotification.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(null);

      const count = await createMonitoringDataReceivedNotifications(deliveryA, [user1, user2]);

      expect(count).toBe(0);
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyNewMonitoringDeliveries', () => {
    it('skips everything when the pre-refresh snapshot is empty', async () => {
      const summary = await notifyNewMonitoringDeliveries(new Set());

      expect(summary).toEqual({ detected: 0, recorded: 0, inApp: 0 });
      expect(mockFindNew).not.toHaveBeenCalled();
      expect(findOrCreateSpy).not.toHaveBeenCalled();
    });

    it('notifies flagged users in each delivery’s home region only', async () => {
      mockFindNew.mockResolvedValue([deliveryA, deliveryB]);
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
        [11, 1, 'Recipient A'],
        [12, 1, 'Recipient A'],
        [13, 1, 'Recipient B'],
      ]);
      expect(summary).toEqual({ detected: 2, recorded: 2, inApp: 3 });
    });

    it('does not notify about deliveries that were already recorded', async () => {
      mockFindNew.mockResolvedValue([deliveryA]);
      findOrCreateSpy.mockResolvedValue([{}, false]);

      const summary = await notifyNewMonitoringDeliveries(new Set([99]));

      expect(summary).toEqual({ detected: 1, recorded: 0, inApp: 0 });
      expect(mockFindUsers).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });
});
