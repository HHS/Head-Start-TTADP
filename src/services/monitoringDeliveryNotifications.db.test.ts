import { NOTIFICATION_TYPES } from '../constants';
import db from '../models';
import { createGrant, createRegion, createUser, getUniqueId } from '../testUtils';
import {
  findMonitoringNotificationUsersByRegion,
  monitoringReportsDeliveredInRegionByDate,
  snapshotDeliveredReviewMrids,
} from './monitoringDeliveries';
import {
  ACTIONABLE_NOTIFICATIONS_FLAG,
  notifyNewMonitoringDeliveries,
} from './monitoringDeliveryNotifications';

const {
  DeliveredReview,
  Grant,
  GrantDeliveredReview,
  MonitoringReportDelivery,
  Notification,
  Recipient,
  Region,
  Role,
  User,
  UserRole,
} = db;

// DB-backed: exercises the real joins for detection, role/region targeting and dedupe.
describe('monitoring delivery notifications (database)', () => {
  let region;
  let otherRegion;
  let grant;
  let oldReview;
  let newReview;
  const users: Record<string, { id: number }> = {};

  const addRole = async (userId: number, name: string) => {
    const role = await Role.findOne({ where: { name } });
    await UserRole.create({ userId, roleId: role.id });
  };

  beforeAll(async () => {
    [region, otherRegion] = await Promise.all([
      createRegion({ id: getUniqueId(3000, 6000) }),
      createRegion({ id: getUniqueId(6001, 9000) }),
    ]);
    grant = await createGrant({ regionId: region.id });

    const flags = [ACTIONABLE_NOTIFICATIONS_FLAG];
    const [ttac, ecm, gsm, gs, otherRegionTtac, noFlagTtac] = await Promise.all([
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: otherRegion.id, flags }),
      createUser({ homeRegionId: region.id, flags: [] }),
    ]);
    Object.assign(users, { ttac, ecm, gsm, gs, otherRegionTtac, noFlagTtac });

    await Promise.all([
      addRole(ttac.id, 'TTAC'),
      // a user with two qualifying roles is only notified once
      addRole(ecm.id, 'ECM'),
      addRole(ecm.id, 'TTAC'),
      addRole(gsm.id, 'GSM'),
      addRole(gs.id, 'GS'),
      addRole(otherRegionTtac.id, 'TTAC'),
      addRole(noFlagTtac.id, 'TTAC'),
    ]);

    const mrid = getUniqueId(1_000_000_000, 1_500_000_000);
    oldReview = await DeliveredReview.create({ mrid, report_delivery_date: '2026-01-01' });
    await GrantDeliveredReview.create({ grantId: grant.id, deliveredReviewId: oldReview.id });
  });

  afterAll(async () => {
    const reviewIds = [oldReview?.id, newReview?.id].filter(Boolean);
    const userIds = Object.values(users).map(({ id }) => id);
    await Notification.destroy({
      where: { entityId: reviewIds, type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED },
    });
    await MonitoringReportDelivery.destroy({ where: { deliveredReviewId: reviewIds } });
    await GrantDeliveredReview.destroy({ where: { deliveredReviewId: reviewIds } });
    await DeliveredReview.destroy({ where: { id: reviewIds }, force: true });
    await UserRole.destroy({ where: { userId: userIds } });
    await User.destroy({ where: { id: userIds } });
    await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true });
    await Recipient.destroy({ where: { id: grant.recipientId }, force: true });
    await Region.destroy({ where: { id: [region.id, otherRegion.id] } });
    await db.sequelize.close();
  });

  it('targets only TTAC/ECM/GSM users whose home region matches', async () => {
    const byRegion = await findMonitoringNotificationUsersByRegion(
      [region.id],
      ACTIONABLE_NOTIFICATIONS_FLAG
    );
    const ids = (byRegion.get(region.id) ?? []).map(({ id }) => id).sort();

    expect(ids).toEqual([users.ttac.id, users.ecm.id, users.gsm.id].sort());
    expect(byRegion.has(otherRegion.id)).toBe(false);
  });

  it('notifies about a newly delivered review once, ignoring already-delivered ones', async () => {
    const snapshot = await snapshotDeliveredReviewMrids();
    expect(snapshot.has(oldReview.mrid)).toBe(true);

    newReview = await DeliveredReview.create({
      mrid: oldReview.mrid + 1,
      report_delivery_date: '2026-11-10',
    });
    await GrantDeliveredReview.create({ grantId: grant.id, deliveredReviewId: newReview.id });

    const first = await notifyNewMonitoringDeliveries(snapshot);
    expect(first).toEqual({ detected: 1, recorded: 1, inApp: 3, emails: 0 });

    const notifications = await Notification.findAll({
      where: { entityId: newReview.id, type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED },
    });
    expect(notifications.map(({ userId }) => userId).sort()).toEqual(
      [users.ttac.id, users.ecm.id, users.gsm.id].sort()
    );
    expect(notifications[0].link).toBe(
      `/recipient-tta-records/${grant.recipientId}/region/${region.id}/monitoring`
    );
    expect(notifications[0].actionable).toBe(false);

    // a second run against the same snapshot records and notifies nothing new
    const second = await notifyNewMonitoringDeliveries(snapshot);
    expect(second).toEqual({ detected: 1, recorded: 0, inApp: 0, emails: 0 });
    expect(
      await Notification.count({
        where: { entityId: newReview.id, type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED },
      })
    ).toBe(3);

    const recorded = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: [oldReview.id, newReview.id] },
    });
    expect(recorded.map((r) => [r.deliveredReviewId, r.recipientId, r.regionId])).toEqual([
      [newReview.id, grant.recipientId, region.id],
    ]);
  });

  it('lists recipients detected in the digest window for qualifying users only', async () => {
    // runs after the previous test recorded newReview; push oldReview's delivery outside the window
    const old = await MonitoringReportDelivery.create({
      deliveredReviewId: oldReview.id,
      recipientId: grant.recipientId,
      regionId: region.id,
    });
    await db.sequelize.query(
      `UPDATE "MonitoringReportDeliveries" SET "createdAt" = NOW() - INTERVAL '10 DAYS' WHERE id = ${old.id}`
    );
    const recipient = await Recipient.findByPk(grant.recipientId);

    const daily = await monitoringReportsDeliveredInRegionByDate(
      users.ttac.id,
      "NOW() - INTERVAL '1 DAY'"
    );
    expect(daily).toEqual([{ id: recipient.id, displayId: recipient.name, regionId: region.id }]);

    // both deliveries are in the monthly window but the recipient is listed once
    const monthly = await monitoringReportsDeliveredInRegionByDate(
      users.ttac.id,
      "NOW() - INTERVAL '1 MONTH'"
    );
    expect(monthly).toEqual([{ id: recipient.id, displayId: recipient.name, regionId: region.id }]);

    for (const excluded of [users.gs, users.otherRegionTtac, users.noFlagTtac]) {
      expect(
        await monitoringReportsDeliveredInRegionByDate(excluded.id, "NOW() - INTERVAL '1 MONTH'")
      ).toEqual([]);
    }
  });
});
