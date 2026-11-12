import { Op } from 'sequelize';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import {
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
  findPendingMonitoringDeliveries,
  MONITORING_NOTIFICATION_ROLES,
  markMonitoringDeliveriesNotified,
  monitoringReportsDeliveredInRegionByDate,
  snapshotDeliveredReviewMrids,
} from './monitoringDeliveries';

const siteAccess = { scopeId: SCOPES.SITE_ACCESS, regionId: 14 };

// In-memory DeliveredReviews used to simulate the table before and after a refresh.
type FakeReview = {
  id: number;
  mrid: number;
  report_delivery_date: string | null;
  grants: {
    id: number;
    regionId: number | null;
    recipientId: number | null;
    recipient?: { name: string };
  }[];
};

type FindAllOptions = {
  where: Record<string | symbol, unknown> & { mrid?: { [Op.notIn]?: number[] } };
  include: { as: string }[];
  raw?: boolean;
};

const callOptions = (spy: jest.SpyInstance, call = 0) => spy.mock.calls[call][0] as FindAllOptions;

const mockDeliveredReviews = (reviews: FakeReview[]) =>
  jest.spyOn(db.DeliveredReview, 'findAll').mockImplementation(async (opts) => {
    const options = opts as FindAllOptions;
    const notIn: number[] = options.where.mrid?.[Op.notIn] ?? [];
    const delivered = reviews.filter(
      (r) => r.report_delivery_date !== null && !notIn.includes(r.mrid)
    );
    if (options.raw) {
      return delivered.map(({ mrid }) => ({ mrid }));
    }
    // mirrors `required: true` on the grants include
    return delivered.filter((r) => r.grants.length);
  });

describe('monitoringDeliveries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('snapshotDeliveredReviewMrids', () => {
    it('returns delivered mrids, including soft-deleted rows', async () => {
      const spy = mockDeliveredReviews([
        { id: 1, mrid: 100, report_delivery_date: '2026-11-01', grants: [] },
        { id: 2, mrid: 200, report_delivery_date: null, grants: [] },
      ]);

      const result = await snapshotDeliveredReviewMrids();

      expect(result).toEqual(new Set([100]));
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          paranoid: false,
          where: { report_delivery_date: { [Op.ne]: null } },
        })
      );
    });

    it('only includes reviews delivered before the given date', async () => {
      const spy = mockDeliveredReviews([]);

      await snapshotDeliveredReviewMrids('2026-11-11');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { report_delivery_date: { [Op.lt]: '2026-11-11' } },
        })
      );
    });
  });

  describe('findNewlyDeliveredReviews', () => {
    const grantA = { id: 10, regionId: 1, recipientId: 500, recipient: { name: 'Recipient A' } };
    const grantA2 = { id: 11, regionId: 1, recipientId: 500, recipient: { name: 'Recipient A' } };
    const grantB = { id: 12, regionId: 2, recipientId: 600, recipient: { name: 'Recipient B' } };

    it('detects a new row that arrives with a delivery date', async () => {
      const before = [{ id: 1, mrid: 100, report_delivery_date: '2026-10-01', grants: [grantA] }];
      mockDeliveredReviews(before);
      const snapshot = await snapshotDeliveredReviewMrids();
      jest.restoreAllMocks();

      mockDeliveredReviews([
        ...before,
        { id: 2, mrid: 200, report_delivery_date: '2026-11-10', grants: [grantB] },
      ]);
      const result = await findNewlyDeliveredReviews(snapshot);

      expect(result).toEqual([
        {
          deliveredReviewId: 2,
          mrid: 200,
          reportDeliveryDate: '2026-11-10',
          recipientId: 600,
          recipientName: 'Recipient B',
          regionId: 2,
          grantIds: [12],
        },
      ]);
    });

    it('detects an existing row whose delivery date goes from NULL to a value', async () => {
      mockDeliveredReviews([{ id: 1, mrid: 100, report_delivery_date: null, grants: [grantA] }]);
      const snapshot = await snapshotDeliveredReviewMrids();
      jest.restoreAllMocks();

      mockDeliveredReviews([
        { id: 1, mrid: 100, report_delivery_date: '2026-11-10', grants: [grantA] },
      ]);
      const result = await findNewlyDeliveredReviews(snapshot);

      expect(result.map((r) => r.mrid)).toEqual([100]);
    });

    it('ignores rows that were already delivered, even if other columns changed', async () => {
      mockDeliveredReviews([
        { id: 1, mrid: 100, report_delivery_date: '2026-10-01', grants: [grantA] },
      ]);
      const snapshot = await snapshotDeliveredReviewMrids();
      jest.restoreAllMocks();

      mockDeliveredReviews([
        { id: 1, mrid: 100, report_delivery_date: '2026-10-02', grants: [grantA] },
      ]);
      const result = await findNewlyDeliveredReviews(snapshot);

      expect(result).toEqual([]);
    });

    it('returns one entry per recipient/report and groups that recipient’s grants', async () => {
      mockDeliveredReviews([
        { id: 3, mrid: 300, report_delivery_date: '2026-11-10', grants: [grantA, grantA2, grantB] },
      ]);

      const result = await findNewlyDeliveredReviews(new Set());

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.recipientId === 500)?.grantIds).toEqual([10, 11]);
      expect(result.find((r) => r.recipientId === 600)?.grantIds).toEqual([12]);
    });

    it('returns one entry per region when a recipient’s grants span two regions', async () => {
      const grantAOtherRegion = { ...grantA2, regionId: 2 };
      mockDeliveredReviews([
        {
          id: 5,
          mrid: 500,
          report_delivery_date: '2026-11-10',
          grants: [grantA, grantAOtherRegion],
        },
      ]);

      const result = await findNewlyDeliveredReviews(new Set());

      expect(result.map((r) => [r.recipientId, r.regionId, r.grantIds])).toEqual([
        [500, 1, [10]],
        [500, 2, [11]],
      ]);
    });

    it('skips grants without a recipient or region', async () => {
      mockDeliveredReviews([
        {
          id: 4,
          mrid: 400,
          report_delivery_date: '2026-11-10',
          grants: [
            { id: 13, regionId: null, recipientId: 700 },
            { id: 14, regionId: 3, recipientId: null },
          ],
        },
      ]);

      expect(await findNewlyDeliveredReviews(new Set())).toEqual([]);
    });

    it('does not add an mrid filter when the snapshot is empty', async () => {
      const spy = mockDeliveredReviews([]);
      await findNewlyDeliveredReviews(new Set());
      expect(callOptions(spy).where).toEqual({ report_delivery_date: { [Op.ne]: null } });
    });
  });

  describe('findMonitoringNotificationUsersByRegion', () => {
    it('queries by home region and TTAC/ECM/GSM roles, grouping users by region', async () => {
      const ttac = {
        id: 1,
        name: 'TTAC One',
        email: 'one@example.com',
        homeRegionId: 1,
        permissions: [siteAccess],
      };
      const spy = jest.spyOn(db.User, 'findAll').mockResolvedValue([
        ttac,
        // same user returned twice when they hold two matching roles
        ttac,
        {
          id: 2,
          name: 'GSM Two',
          email: 'two@example.com',
          homeRegionId: 2,
          permissions: [siteAccess],
        },
      ]);

      const result = await findMonitoringNotificationUsersByRegion([1, 2, 2]);

      const options = callOptions(spy);
      expect(options.where).toEqual({ homeRegionId: [1, 2] });
      expect(options.include.find((i) => i.as === 'roles')).toEqual(
        expect.objectContaining({
          as: 'roles',
          required: true,
          where: { name: MONITORING_NOTIFICATION_ROLES },
        })
      );
      expect(MONITORING_NOTIFICATION_ROLES).toEqual(['TTAC', 'ECM', 'GSM']);
      expect(result.get(1)?.map((u) => u.id)).toEqual([1]);
      expect(result.get(2)?.map((u) => u.id)).toEqual([2]);
      expect(result.has(3)).toBe(false);
    });

    it('filters out users who cannot see the feature flag, letting admins through', async () => {
      jest.spyOn(db.User, 'findAll').mockResolvedValue([
        {
          id: 1,
          name: 'Flagged',
          email: 'a@example.com',
          homeRegionId: 1,
          flags: ['flag'],
          permissions: [siteAccess],
        },
        {
          id: 2,
          name: 'Unflagged',
          email: 'b@example.com',
          homeRegionId: 1,
          flags: [],
          permissions: [siteAccess],
        },
        {
          id: 3,
          name: 'Admin',
          email: 'c@example.com',
          homeRegionId: 1,
          flags: [],
          permissions: [siteAccess, { scopeId: SCOPES.ADMIN, regionId: 14 }],
        },
      ]);

      const result = await findMonitoringNotificationUsersByRegion([1], 'flag');

      expect(result.get(1)?.map((u) => u.id)).toEqual([1, 3]);
    });

    it('requires Hub access (SITE_ACCESS) in the query, returning ADMIN for the flag check', async () => {
      const spy = jest.spyOn(db.User, 'findAll').mockResolvedValue([]);

      await findMonitoringNotificationUsersByRegion([1], 'flag');

      expect(callOptions(spy).include.find((i) => i.as === 'permissions')).toEqual(
        expect.objectContaining({
          as: 'permissions',
          attributes: ['scopeId'],
          required: true,
          where: { scopeId: [SCOPES.SITE_ACCESS, SCOPES.ADMIN] },
        })
      );
    });

    it('does not query when no valid regions are given', async () => {
      const spy = jest.spyOn(db.User, 'findAll');
      const result = await findMonitoringNotificationUsersByRegion([]);
      expect(result.size).toBe(0);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('findPendingMonitoringDeliveries', () => {
    it('returns unnotified deliveries from the last week with recipient names', async () => {
      const now = new Date('2026-11-12T12:00:00Z');
      const spy = jest
        .spyOn(db.MonitoringReportDelivery, 'findAll')
        .mockResolvedValue([
          { id: 7, deliveredReviewId: 1, recipientId: 500, regionId: 2, recipient: { name: 'A' } },
        ]);

      const result = await findPendingMonitoringDeliveries(now);

      expect(result).toEqual([
        {
          monitoringDeliveryId: 7,
          deliveredReviewId: 1,
          recipientId: 500,
          recipientName: 'A',
          regionId: 2,
        },
      ]);
      const { where } = spy.mock.calls[0][0] as {
        where: { notifiedAt: null; createdAt: { [Op.gte]: Date } };
      };
      expect(where.notifiedAt).toBeNull();
      expect(where.createdAt[Op.gte]).toEqual(new Date('2026-11-05T12:00:00Z'));
    });
  });

  describe('markMonitoringDeliveriesNotified', () => {
    it('sets notifiedAt on the given deliveries', async () => {
      const now = new Date('2026-11-12T12:00:00Z');
      const spy = jest.spyOn(db.MonitoringReportDelivery, 'update').mockResolvedValue([2]);

      await markMonitoringDeliveriesNotified([7, 8], now);

      expect(spy).toHaveBeenCalledWith({ notifiedAt: now }, { where: { id: [7, 8] } });
    });

    it('does nothing for an empty list', async () => {
      const spy = jest.spyOn(db.MonitoringReportDelivery, 'update');
      await markMonitoringDeliveriesNotified([]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('monitoringReportsDeliveredInRegionByDate', () => {
    const DAY = "NOW() - INTERVAL '1 DAY'";
    const WEEK = "NOW() - INTERVAL '1 WEEK'";
    const now = new Date('2026-11-16T21:00:00Z'); // a Monday afternoon
    const qualifyingUser = {
      id: 5,
      email: 'ttac@example.com',
      homeRegionId: 3,
      flags: ['actionable_notifications'],
      permissions: [],
      roles: [{ name: 'GS' }, { name: 'ECM' }],
    };
    const delivery = (id: number, name: string) => ({ recipient: { id, name } });

    const windowStart = (spy: jest.SpyInstance) =>
      (spy.mock.calls[0][0] as { where: { createdAt: { [Op.gte]: Date } } }).where.createdAt[
        Op.gte
      ];

    beforeEach(() => {
      jest.spyOn(db.MailerLogs, 'findOne').mockResolvedValue(null);
    });

    it('returns each recipient delivered in the home region once, sorted by name', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(qualifyingUser);
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll').mockResolvedValue([
        delivery(2, 'Zeta Start'),
        delivery(1, 'Alpha Start'),
        delivery(1, 'Alpha Start'),
        // a different recipient that shares a name gets its own entry and link
        delivery(3, 'Zeta Start'),
      ]);

      const result = await monitoringReportsDeliveredInRegionByDate(5, DAY, now);

      expect(result).toEqual([
        { id: 1, displayId: 'Alpha Start', regionId: 3 },
        { id: 2, displayId: 'Zeta Start', regionId: 3 },
        { id: 3, displayId: 'Zeta Start', regionId: 3 },
      ]);
      const { where } = findAllSpy.mock.calls[0][0] as { where: { regionId: number } };
      expect(where.regionId).toBe(3);
    });

    it('starts the window at the last successful monitoring digest for the user', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(qualifyingUser);
      // Friday's daily digest; Monday's covers the weekend
      const friday = new Date('2026-11-13T21:01:00Z');
      const mailerSpy = jest
        .spyOn(db.MailerLogs, 'findOne')
        .mockResolvedValue({ createdAt: friday });
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll').mockResolvedValue([]);

      await monitoringReportsDeliveredInRegionByDate(5, DAY, now);

      expect(windowStart(findAllSpy)).toEqual(friday);
      expect(mailerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: 'monitoringDetailsAddedDigest',
            success: true,
            emailTo: { [Op.contains]: ['ttac@example.com'] },
          },
          order: [['createdAt', 'DESC']],
        })
      );
    });

    it.each([
      ['daily', DAY, '2026-11-12T21:00:00Z'],
      ['weekly', WEEK, '2026-11-08T21:00:00Z'],
    ])('caps the %s window when the last digest is older', async (_label, window, expected) => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(qualifyingUser);
      jest
        .spyOn(db.MailerLogs, 'findOne')
        .mockResolvedValue({ createdAt: new Date('2026-09-01T00:00:00Z') });
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll').mockResolvedValue([]);

      await monitoringReportsDeliveredInRegionByDate(5, window, now);

      expect(windowStart(findAllSpy)).toEqual(new Date(expected));
    });

    it('uses the longest window when the user has never had a monitoring digest', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(qualifyingUser);
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll').mockResolvedValue([]);

      await monitoringReportsDeliveredInRegionByDate(5, DAY, now);

      expect(windowStart(findAllSpy)).toEqual(new Date('2026-11-12T21:00:00Z'));
    });

    it.each([
      ['has no qualifying role', { roles: [{ name: 'GS' }] }],
      ['has no home region', { homeRegionId: null }],
      ['cannot see the feature flag', { flags: [] }],
    ])('returns nothing when the user %s', async (_label, overrides) => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue({ ...qualifyingUser, ...overrides });
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll');

      expect(await monitoringReportsDeliveredInRegionByDate(5, DAY)).toEqual([]);
      expect(findAllSpy).not.toHaveBeenCalled();
    });

    it('returns nothing when the user does not exist', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(null);
      expect(await monitoringReportsDeliveredInRegionByDate(5, DAY)).toEqual([]);
    });

    it('rejects a window that is not one of the digest intervals', async () => {
      await expect(
        monitoringReportsDeliveredInRegionByDate(5, '1=1; DROP TABLE x')
      ).rejects.toThrow('Invalid monitoring digest window');
    });
  });
});
