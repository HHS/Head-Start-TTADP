import { Op } from 'sequelize';
import db from '../models';
import Users from '../policies/user';

const { DeliveredReview, Grant, MonitoringReportDelivery, Permission, Recipient, Role, User } = db;

// rollout gate for the in-app, immediate email and digest monitoring notifications
export const ACTIONABLE_NOTIFICATIONS_FLAG = 'actionable_notifications';

// The digest window comes from frequencyToInterval() as a SQL expression. Only these values
// are accepted, since the expression is used as a literal.
const DIGEST_WINDOWS = [
  "NOW() - INTERVAL '1 DAY'",
  "NOW() - INTERVAL '1 WEEK'",
  "NOW() - INTERVAL '1 MONTH'",
];

// Users with any of these roles, whose home region matches a newly delivered monitoring
// report's grant region, are notified of the report (Misc-1a / Misc-6a).
export const MONITORING_NOTIFICATION_ROLES = ['TTAC', 'ECM', 'GSM'];

export type NewMonitoringDelivery = {
  deliveredReviewId: number;
  mrid: number;
  reportDeliveryDate: string;
  recipientId: number;
  recipientName: string;
  regionId: number;
  grantIds: number[];
};

export type MonitoringNotificationUser = {
  id: number;
  name: string;
  email: string;
  homeRegionId: number;
};

/**
 * Returns the mrids of every DeliveredReview that already has a report delivery date.
 * Take this snapshot before `updateMonitoringFactTables()` and pass it to
 * `findNewlyDeliveredReviews()` afterward. Soft-deleted rows are included so a review that is
 * removed and later restored by the refresh is not treated as a new delivery.
 * @param {string} [deliveredBefore] `YYYY-MM-DD`. When given, only reviews delivered before
 * this date are included, so reviews delivered on or after it look new.
 * @returns {Promise<Set<number>>} The mrids already delivered.
 */
export async function snapshotDeliveredReviewMrids(deliveredBefore?: string): Promise<Set<number>> {
  const rows = await DeliveredReview.findAll({
    attributes: ['mrid'],
    where: {
      report_delivery_date: deliveredBefore ? { [Op.lt]: deliveredBefore } : { [Op.ne]: null },
    },
    paranoid: false,
    raw: true,
  });
  return new Set(rows.map(({ mrid }) => Number(mrid)));
}

/**
 * Returns monitoring reports that have a delivery date now but were not in the snapshot,
 * meaning either a new row arrived already delivered or an existing row's delivery date went
 * from NULL to a value. Results have one entry per recipient/report combination, because one
 * review can cover several grants and recipients. Grants without a recipient or region are
 * skipped.
 * @param {Set<number>} previouslyDeliveredMrids From `snapshotDeliveredReviewMrids()`.
 * @returns {Promise<NewMonitoringDelivery[]>} The new recipient/report combinations.
 */
export async function findNewlyDeliveredReviews(
  previouslyDeliveredMrids: Set<number>
): Promise<NewMonitoringDelivery[]> {
  const reviews = await DeliveredReview.findAll({
    attributes: ['id', 'mrid', 'report_delivery_date'],
    where: {
      report_delivery_date: { [Op.ne]: null },
      ...(previouslyDeliveredMrids.size
        ? { mrid: { [Op.notIn]: [...previouslyDeliveredMrids] } }
        : {}),
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['id', 'regionId', 'recipientId'],
        through: { attributes: [] },
        required: true,
        include: [{ model: Recipient, as: 'recipient', attributes: ['id', 'name'] }],
      },
    ],
  });

  const deliveries = new Map<string, NewMonitoringDelivery>();
  reviews.forEach((review) => {
    review.grants.forEach((grant) => {
      if (!grant.recipientId || !grant.regionId) {
        return;
      }
      const key = `${review.id}-${grant.recipientId}`;
      const existing = deliveries.get(key);
      if (existing) {
        existing.grantIds.push(grant.id);
        return;
      }
      deliveries.set(key, {
        deliveredReviewId: review.id,
        mrid: review.mrid,
        reportDeliveryDate: review.report_delivery_date,
        recipientId: grant.recipientId,
        recipientName: grant.recipient?.name ?? '',
        regionId: grant.regionId,
        grantIds: [grant.id],
      });
    });
  });

  return [...deliveries.values()];
}

/**
 * Returns the users who should hear about monitoring reports in the given regions: those
 * with a TTAC, ECM or GSM role whose home region is one of the regions. Read permissions are
 * not considered; a TTAC who can read several regions is only notified about their home region.
 * @param {number[]} regionIds Regions to target.
 * @param {string} [featureFlag] When given, only users who can see this feature flag.
 * @returns {Promise<Map<number, MonitoringNotificationUser[]>>} Users keyed by home region.
 */
export async function findMonitoringNotificationUsersByRegion(
  regionIds: number[],
  featureFlag?: string
): Promise<Map<number, MonitoringNotificationUser[]>> {
  const byRegion = new Map<number, MonitoringNotificationUser[]>();
  const uniqueRegionIds = [...new Set(regionIds)].filter((id) => Number.isInteger(id));
  if (!uniqueRegionIds.length) {
    return byRegion;
  }

  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'homeRegionId', 'flags'],
    where: { homeRegionId: uniqueRegionIds },
    include: [
      // the feature flag check lets admins through, which needs permissions
      { model: Permission, as: 'permissions', attributes: ['scopeId', 'regionId'] },
      {
        model: Role,
        as: 'roles',
        attributes: [],
        where: { name: MONITORING_NOTIFICATION_ROLES },
        through: { attributes: [] },
        required: true,
      },
    ],
  });

  users.forEach((user) => {
    if (featureFlag && !new Users(user).canSeeBehindFeatureFlag(featureFlag)) {
      return;
    }
    const { id, name, email, homeRegionId } = user;
    const regionUsers = byRegion.get(homeRegionId) ?? [];
    // the role join can return a user once per matching role
    if (!regionUsers.some((u) => u.id === id)) {
      regionUsers.push({ id, name, email, homeRegionId });
    }
    byRegion.set(homeRegionId, regionUsers);
  });

  return byRegion;
}

export type MonitoringDigestRecipient = {
  id: number;
  displayId: string;
  regionId: number;
};

/**
 * Digest fetcher for the monitoring digest (Misc-6a). Returns the recipients with monitoring
 * reports the Hub detected in the user's home region since `date`, one entry per recipient,
 * sorted by name. Returns an empty list for users who would not get the in-app or
 * immediate notification: no TTAC/ECM/GSM role, no home region, or no
 * actionable_notifications feature flag.
 * @param {number} userId The digest recipient.
 * @param {string} date SQL interval expression from `frequencyToInterval()`.
 * @returns {Promise<MonitoringDigestRecipient[]>} `id` is the recipient id and `displayId` its name.
 */
export async function monitoringReportsDeliveredInRegionByDate(
  userId: number,
  date: string
): Promise<MonitoringDigestRecipient[]> {
  if (!DIGEST_WINDOWS.includes(date)) {
    throw new Error(`Invalid monitoring digest window: ${date}`);
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'homeRegionId', 'flags'],
    include: [
      { model: Permission, as: 'permissions', attributes: ['scopeId', 'regionId'] },
      { model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } },
    ],
  });

  const qualifies =
    user?.homeRegionId &&
    user.roles.some(({ name }) => MONITORING_NOTIFICATION_ROLES.includes(name)) &&
    new Users(user).canSeeBehindFeatureFlag(ACTIONABLE_NOTIFICATIONS_FLAG);
  if (!qualifies) {
    return [];
  }

  const deliveries = await MonitoringReportDelivery.findAll({
    attributes: ['recipientId'],
    where: {
      regionId: user.homeRegionId,
      createdAt: { [Op.gte]: db.sequelize.literal(date) },
    },
    include: [{ model: Recipient, as: 'recipient', attributes: ['id', 'name'] }],
  });

  const byId = new Map<number, MonitoringDigestRecipient>();
  deliveries.forEach(({ recipient }) => {
    if (recipient && !byId.has(recipient.id)) {
      byId.set(recipient.id, {
        id: recipient.id,
        displayId: recipient.name,
        regionId: user.homeRegionId,
      });
    }
  });

  return [...byId.values()].sort((a, b) => a.displayId.localeCompare(b.displayId));
}
