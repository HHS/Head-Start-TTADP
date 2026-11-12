import { NOTIFICATION_TYPES } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { createGrant, createRecipient, createRegion, createUser, getUniqueId } from '../testUtils';
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
  Permission,
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
  // the same recipient's grant in another region
  let otherRegionGrant;
  // a different recipient in the same region with the same name as grant's recipient
  let twinGrant;
  let twinRecipient;
  let oldReview;
  let newReview;
  let multiReview;
  const users: Record<string, { id: number }> = {};

  const reviewIds = () => [oldReview?.id, newReview?.id, multiReview?.id].filter(Boolean);
  const monitoringNotifications = async (reviewId: number) => {
    const deliveries = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: reviewId },
    });
    return Notification.findAll({
      where: {
        entityId: deliveries.map(({ id }) => id),
        type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
      },
    });
  };

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
    const recipient = await Recipient.findByPk(grant.recipientId);
    twinRecipient = await createRecipient({ name: recipient.name });
    [otherRegionGrant, twinGrant] = await Promise.all([
      createGrant({ regionId: otherRegion.id, recipientId: recipient.id }),
      createGrant({ regionId: region.id, recipientId: twinRecipient.id }),
    ]);

    const flags = [ACTIONABLE_NOTIFICATIONS_FLAG];
    const [ttac, ecm, gsm, gs, otherRegionTtac, noFlagTtac, revokedTtac] = await Promise.all([
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: region.id, flags }),
      createUser({ homeRegionId: otherRegion.id, flags }),
      createUser({ homeRegionId: region.id, flags: [] }),
      createUser({ homeRegionId: region.id, flags }),
    ]);
    Object.assign(users, { ttac, ecm, gsm, gs, otherRegionTtac, noFlagTtac, revokedTtac });

    // everyone but revokedTtac has Hub access; revokedTtac keeps a read permission
    await Permission.bulkCreate([
      ...[ttac, ecm, gsm, gs, otherRegionTtac, noFlagTtac].map(({ id }) => ({
        userId: id,
        scopeId: SCOPES.SITE_ACCESS,
        regionId: region.id,
      })),
      { userId: revokedTtac.id, scopeId: SCOPES.READ_REPORTS, regionId: region.id },
    ]);

    await Promise.all([
      addRole(ttac.id, 'TTAC'),
      // a user with two qualifying roles is only notified once
      addRole(ecm.id, 'ECM'),
      addRole(ecm.id, 'TTAC'),
      addRole(gsm.id, 'GSM'),
      addRole(gs.id, 'GS'),
      addRole(otherRegionTtac.id, 'TTAC'),
      addRole(noFlagTtac.id, 'TTAC'),
      addRole(revokedTtac.id, 'TTAC'),
    ]);

    const mrid = getUniqueId(1_000_000_000, 1_500_000_000);
    oldReview = await DeliveredReview.create({ mrid, report_delivery_date: '2026-01-01' });
    await GrantDeliveredReview.create({ grantId: grant.id, deliveredReviewId: oldReview.id });
  });

  afterAll(async () => {
    const userIds = Object.values(users).map(({ id }) => id);
    const deliveries = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: reviewIds() },
    });
    await Notification.destroy({
      where: {
        entityId: deliveries.map(({ id }) => id),
        type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
      },
    });
    await MonitoringReportDelivery.destroy({ where: { deliveredReviewId: reviewIds() } });
    await GrantDeliveredReview.destroy({ where: { deliveredReviewId: reviewIds() } });
    await DeliveredReview.destroy({ where: { id: reviewIds() }, force: true });
    await UserRole.destroy({ where: { userId: userIds } });
    await Permission.destroy({ where: { userId: userIds } });
    await User.destroy({ where: { id: userIds } });
    await Grant.destroy({
      where: { id: [grant.id, otherRegionGrant.id, twinGrant.id] },
      force: true,
      individualHooks: true,
    });
    await Recipient.destroy({ where: { id: [grant.recipientId, twinRecipient.id] }, force: true });
    await Region.destroy({ where: { id: [region.id, otherRegion.id] } });
    await db.sequelize.close();
  });

  it('targets only TTAC/ECM/GSM users with Hub access whose home region matches', async () => {
    const byRegion = await findMonitoringNotificationUsersByRegion(
      [region.id],
      ACTIONABLE_NOTIFICATIONS_FLAG
    );
    const ids = (byRegion.get(region.id) ?? []).map(({ id }) => id).sort();

    expect(ids).toEqual([users.ttac.id, users.ecm.id, users.gsm.id].sort());
    expect(byRegion.has(otherRegion.id)).toBe(false);
  });

  it('targets admins with Hub access even without the feature flag', async () => {
    const admin = await createUser({ homeRegionId: region.id, flags: [] });
    try {
      await Permission.bulkCreate([
        { userId: admin.id, scopeId: SCOPES.SITE_ACCESS, regionId: region.id },
        { userId: admin.id, scopeId: SCOPES.ADMIN, regionId: region.id },
      ]);
      await addRole(admin.id, 'TTAC');

      const byRegion = await findMonitoringNotificationUsersByRegion(
        [region.id],
        ACTIONABLE_NOTIFICATIONS_FLAG
      );
      const ids = (byRegion.get(region.id) ?? []).map(({ id }) => id);

      expect(ids).toContain(admin.id);
      expect(ids).not.toContain(users.noFlagTtac.id);
    } finally {
      await UserRole.destroy({ where: { userId: admin.id } });
      await Permission.destroy({ where: { userId: admin.id } });
      await User.destroy({ where: { id: admin.id } });
    }
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
    // pending rows are found across the whole table, so only this test's counts are exact
    expect(first).toMatchObject({ detected: 1, recorded: 1 });

    const notifications = await monitoringNotifications(newReview.id);
    expect(notifications.map(({ userId }) => userId).sort()).toEqual(
      [users.ttac.id, users.ecm.id, users.gsm.id].sort()
    );
    expect(notifications[0].link).toBe(
      `/recipient-tta-records/${grant.recipientId}/region/${region.id}/monitoring`
    );
    expect(notifications[0].actionable).toBe(false);

    // a second run against the same snapshot records and notifies nothing new
    const second = await notifyNewMonitoringDeliveries(snapshot);
    expect(second).toMatchObject({ detected: 1, recorded: 0 });
    expect(await monitoringNotifications(newReview.id)).toHaveLength(3);

    const recorded = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: [oldReview.id, newReview.id] },
    });
    expect(recorded.map((r) => [r.deliveredReviewId, r.recipientId, r.regionId])).toEqual([
      [newReview.id, grant.recipientId, region.id],
    ]);
    expect(recorded[0].notifiedAt).not.toBeNull();
  });

  it('retries a recorded delivery whose notifications were never sent', async () => {
    const [row] = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: newReview.id },
    });
    // simulate a run that recorded the delivery and then failed
    await Notification.destroy({
      where: { entityId: row.id, type: NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED },
    });
    await row.update({ notifiedAt: null });

    const summary = await notifyNewMonitoringDeliveries(await snapshotDeliveredReviewMrids());

    expect(summary).toMatchObject({ detected: 0, recorded: 0 });
    expect(await monitoringNotifications(newReview.id)).toHaveLength(3);
    await row.reload();
    expect(row.notifiedAt).not.toBeNull();
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

  it('notifies each region of a cross-region review and keeps same-named recipients apart', async () => {
    const snapshot = await snapshotDeliveredReviewMrids();
    multiReview = await DeliveredReview.create({
      mrid: oldReview.mrid + 2,
      report_delivery_date: '2026-11-11',
    });
    await GrantDeliveredReview.bulkCreate(
      [grant, otherRegionGrant, twinGrant].map(({ id }) => ({
        grantId: id,
        deliveredReviewId: multiReview.id,
      }))
    );

    const summary = await notifyNewMonitoringDeliveries(snapshot);

    // grant's recipient in two regions, plus the same-named twin in region
    expect(summary).toMatchObject({ detected: 3, recorded: 3 });
    const recorded = await MonitoringReportDelivery.findAll({
      where: { deliveredReviewId: multiReview.id },
    });
    expect(recorded.map((r) => [r.recipientId, r.regionId]).sort()).toEqual(
      [
        [grant.recipientId, region.id],
        [grant.recipientId, otherRegion.id],
        [twinRecipient.id, region.id],
      ].sort()
    );

    const notifications = await monitoringNotifications(multiReview.id);
    const forUser = (userId: number) =>
      notifications
        .filter((n) => n.userId === userId)
        .map(({ link }) => link)
        .sort();
    // the other region's TTAC hears about the recipient's grant in their region
    expect(forUser(users.otherRegionTtac.id)).toEqual([
      `/recipient-tta-records/${grant.recipientId}/region/${otherRegion.id}/monitoring`,
    ]);
    // both same-named recipients get their own notification and link
    expect(forUser(users.ttac.id)).toEqual(
      [
        `/recipient-tta-records/${grant.recipientId}/region/${region.id}/monitoring`,
        `/recipient-tta-records/${twinRecipient.id}/region/${region.id}/monitoring`,
      ].sort()
    );
    expect(forUser(users.revokedTtac.id)).toEqual([]);
  });
});
