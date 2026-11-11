import { Op } from 'sequelize';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import {
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
  MONITORING_NOTIFICATION_ROLES,
  monitoringReportsDeliveredInRegionByDate,
  snapshotDeliveredReviewMrids,
} from './monitoringDeliveries';

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
      const spy = jest.spyOn(db.User, 'findAll').mockResolvedValue([
        { id: 1, name: 'TTAC One', email: 'one@example.com', homeRegionId: 1 },
        // same user returned twice when they hold two matching roles
        { id: 1, name: 'TTAC One', email: 'one@example.com', homeRegionId: 1 },
        { id: 2, name: 'GSM Two', email: 'two@example.com', homeRegionId: 2 },
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
          permissions: [],
        },
        {
          id: 2,
          name: 'Unflagged',
          email: 'b@example.com',
          homeRegionId: 1,
          flags: [],
          permissions: [],
        },
        {
          id: 3,
          name: 'Admin',
          email: 'c@example.com',
          homeRegionId: 1,
          flags: [],
          permissions: [{ scopeId: SCOPES.ADMIN, regionId: 14 }],
        },
      ]);

      const result = await findMonitoringNotificationUsersByRegion([1], 'flag');

      expect(result.get(1)?.map((u) => u.id)).toEqual([1, 3]);
    });

    it('does not query when no valid regions are given', async () => {
      const spy = jest.spyOn(db.User, 'findAll');
      const result = await findMonitoringNotificationUsersByRegion([]);
      expect(result.size).toBe(0);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('monitoringReportsDeliveredInRegionByDate', () => {
    const DAY = "NOW() - INTERVAL '1 DAY'";
    const qualifyingUser = {
      id: 5,
      homeRegionId: 3,
      flags: ['actionable_notifications'],
      permissions: [],
      roles: [{ name: 'GS' }, { name: 'ECM' }],
    };
    const delivery = (id: number, name: string) => ({ recipient: { id, name } });

    it('returns each recipient delivered in the home region once, sorted by name', async () => {
      jest.spyOn(db.User, 'findByPk').mockResolvedValue(qualifyingUser);
      const findAllSpy = jest.spyOn(db.MonitoringReportDelivery, 'findAll').mockResolvedValue([
        delivery(2, 'Zeta Start'),
        delivery(1, 'Alpha Start'),
        delivery(1, 'Alpha Start'),
        // a different recipient that shares a name gets its own entry and link
        delivery(3, 'Zeta Start'),
      ]);

      const result = await monitoringReportsDeliveredInRegionByDate(5, DAY);

      expect(result).toEqual([
        { id: 1, displayId: 'Alpha Start', regionId: 3 },
        { id: 2, displayId: 'Zeta Start', regionId: 3 },
        { id: 3, displayId: 'Zeta Start', regionId: 3 },
      ]);
      const { where } = findAllSpy.mock.calls[0][0] as {
        where: { regionId: number; createdAt: { [Op.gte]: { val: string } } };
      };
      expect(where.regionId).toBe(3);
      expect(where.createdAt[Op.gte].val).toBe(DAY);
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
