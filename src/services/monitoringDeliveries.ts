import { Op } from 'sequelize';
import { EMAIL_ACTIONS } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import Users from '../policies/user';

const {
  DeliveredReview,
  Grant,
  MailerLogs,
  MonitoringReportDelivery,
  Permission,
  Recipient,
  Role,
  User,
} = db;

// rollout gate for the in-app, immediate email and digest monitoring notifications
export const ACTIONABLE_NOTIFICATIONS_FLAG = 'actionable_notifications';

const DAY_MS = 24 * 60 * 60 * 1000;

// The digest fetcher receives the window from frequencyToInterval() as a SQL expression. Only
// these values are accepted. The window actually starts at the user's last successful
// monitoring digest, so deliveries are not missed when a run is skipped (the daily digest only
// runs on weekdays, but monitoring data arrives every day). Each value here is the longest the
// window can reach back, which also applies when the user has never had a digest.
const DIGEST_MAX_LOOKBACK_DAYS: Record<string, number> = {
  // Friday to Monday, plus a Monday holiday
  "NOW() - INTERVAL '1 DAY'": 4,
  "NOW() - INTERVAL '1 WEEK'": 8,
  "NOW() - INTERVAL '1 MONTH'": 32,
};

// Pending deliveries older than this are no longer retried, so a long outage does not end in a
// flood of stale notifications.
const PENDING_RETRY_DAYS = 7;

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

// What sending notifications for one delivery needs. `monitoringDeliveryId` is the
// MonitoringReportDelivery row, one per recipient/report/region.
export type NotifiableMonitoringDelivery = {
  monitoringDeliveryId: number;
  deliveredReviewId: number;
  recipientId: number;
  recipientName: string;
  regionId: number;
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
  }) as {
    mrid: number;
  }[];
  return new Set(rows.map(({ mrid }) => Number(mrid)));
}

/**
 * Returns monitoring reports that have a delivery date now but were not in the snapshot,
 * meaning either a new row arrived already delivered or an existing row's delivery date went
 * from NULL to a value. Results have one entry per recipient/report/region combination,
 * because one review can cover several grants and recipients, and a recipient's grants can be
 * in more than one region. Grants without a recipient or region are skipped.
 * @param {Set<number>} previouslyDeliveredMrids From `snapshotDeliveredReviewMrids()`.
 * @returns {Promise<NewMonitoringDelivery[]>} The new recipient/report/region combinations.
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
  }) as {
    id: number;
    mrid: number;
    report_delivery_date: string;
    grants: {
      id: number;
      regionId: number;
      recipientId: number;
      recipient: {
        id: number;
        name: string;
      }
    }[]
  }[];

  const deliveries = new Map<string, NewMonitoringDelivery>();
  reviews.forEach((review) => {
    review.grants.forEach((grant) => {
      if (!grant.recipientId || !grant.regionId) {
        return;
      }
      const key = `${review.id}-${grant.recipientId}-${grant.regionId}`;
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
 * with Hub access (SITE_ACCESS) and a TTAC, ECM or GSM role whose home region is one of the
 * regions. Read permissions are not considered; a TTAC who can read several regions is only
 * notified about their home region.
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
      // Users whose Hub access was revoked keep their role and home region, so require
      // SITE_ACCESS. ADMIN is also returned so the feature flag check can let admins through;
      // every admin also has SITE_ACCESS.
      {
        model: Permission,
        as: 'permissions',
        attributes: ['scopeId'],
        where: { scopeId: [SCOPES.SITE_ACCESS, SCOPES.ADMIN] },
        required: true,
      },
      {
        model: Role,
        as: 'roles',
        attributes: [],
        where: { name: MONITORING_NOTIFICATION_ROLES },
        through: { attributes: [] },
        required: true,
      },
    ],
  }) as {
    id: number;
    name: string;
    email: string;
    homeRegionId: number;
    flags: string[],
  }[];

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

/**
 * Returns the recorded deliveries whose notifications have not all been sent yet, oldest
 * first. A delivery stays pending when sending failed, so the next refresh retries it.
 * Deliveries recorded more than a week ago are left alone.
 * @param {Date} [now] Defaults to the current time.
 * @returns {Promise<NotifiableMonitoringDelivery[]>}
 */
export async function findPendingMonitoringDeliveries(
  now: Date = new Date()
): Promise<NotifiableMonitoringDelivery[]> {
  const rows = await MonitoringReportDelivery.findAll({
    attributes: ['id', 'deliveredReviewId', 'recipientId', 'regionId'],
    where: {
      notifiedAt: null,
      createdAt: { [Op.gte]: new Date(now.getTime() - PENDING_RETRY_DAYS * DAY_MS) },
    },
    include: [{ model: Recipient, as: 'recipient', attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  }) as {
    id: number;
    deliveredReviewId: number;
    recipientId: number;
    regionId: number;
    recipient: {
      id: number;
      name: string;
    }
  }[];

  return rows.map((row) => ({
    monitoringDeliveryId: row.id,
    deliveredReviewId: row.deliveredReviewId,
    recipientId: row.recipientId,
    recipientName: row.recipient?.name ?? '',
    regionId: row.regionId,
  }));
}

/**
 * Marks deliveries as fully notified so they are not retried.
 * @param {number[]} monitoringDeliveryIds MonitoringReportDelivery ids.
 */
export async function markMonitoringDeliveriesNotified(
  monitoringDeliveryIds: number[],
  now: Date = new Date()
): Promise<void> {
  if (!monitoringDeliveryIds.length) {
    return;
  }
  await MonitoringReportDelivery.update(
    { notifiedAt: now },
    { where: { id: monitoringDeliveryIds } }
  );
}

export type MonitoringDigestRecipient = {
  id: number;
  displayId: string;
  regionId: number;
};

/**
 * Digest fetcher for the monitoring digest (Misc-6a). Returns the recipients with monitoring
 * reports the Hub detected in the user's home region since the user's last successful
 * monitoring digest, one entry per recipient, sorted by name. The window reaches back no
 * further than `DIGEST_MAX_LOOKBACK_DAYS` for the frequency. Returns an empty list for users
 * who would not get the in-app or immediate notification: no TTAC/ECM/GSM role, no home
 * region, or no actionable_notifications feature flag.
 * @param {number} userId The digest recipient.
 * @param {string} date SQL interval expression from `frequencyToInterval()`, used to pick the
 * longest window.
 * @param {Date} [now] Defaults to the current time.
 * @returns {Promise<MonitoringDigestRecipient[]>} `id` is the recipient id and `displayId` its name.
 */
export async function monitoringReportsDeliveredInRegionByDate(
  userId: number,
  date: string,
  now: Date = new Date()
): Promise<MonitoringDigestRecipient[]> {
  const maxLookbackDays = DIGEST_MAX_LOOKBACK_DAYS[date];
  if (!maxLookbackDays) {
    throw new Error(`Invalid monitoring digest window: ${date}`);
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'homeRegionId', 'flags'],
    include: [
      { model: Permission, as: 'permissions', attributes: ['scopeId', 'regionId'] },
      { model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } },
    ],
  }) as {
    id: number;
    email: string;
    homeRegionId: number;
    flags: string[];
    roles: { name: string }[];
  };

  const qualifies =
    user?.homeRegionId &&
    user.roles.some(({ name }) => MONITORING_NOTIFICATION_ROLES.includes(name)) &&
    new Users(user).canSeeBehindFeatureFlag(ACTIONABLE_NOTIFICATIONS_FLAG);
  if (!qualifies) {
    return [];
  }

  const lastDigest = await MailerLogs.findOne({
    attributes: ['createdAt'],
    where: {
      action: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
      success: true,
      emailTo: { [Op.contains]: [user.email] },
    },
    order: [['createdAt', 'DESC']],
  });
  const earliest = new Date(now.getTime() - maxLookbackDays * DAY_MS);
  const since =
    lastDigest && new Date(lastDigest.createdAt) > earliest
      ? new Date(lastDigest.createdAt)
      : earliest;

  const deliveries = await MonitoringReportDelivery.findAll({
    attributes: ['recipientId'],
    where: {
      regionId: user.homeRegionId,
      createdAt: { [Op.gte]: since },
    },
    include: [{ model: Recipient, as: 'recipient', attributes: ['id', 'name'] }],
  }) as {
    recipientId: number;
    recipient: {
      id: number;
      name: string;
    }
  }[];

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
