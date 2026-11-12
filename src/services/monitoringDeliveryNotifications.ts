import type { NotificationMetadata } from '@ttahub/common/src/notifications';
import { EMAIL_ACTIONS, NOTIFICATION_TYPES, USER_SETTINGS } from '../constants';
import { monitoringDetailsAddedNotification } from '../lib/mailer';
import { auditLogger, logger } from '../logger';
import db from '../models';
import {
  ACTIONABLE_NOTIFICATIONS_FLAG,
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
  findPendingMonitoringDeliveries,
  type MonitoringNotificationUser,
  markMonitoringDeliveriesNotified,
  type NewMonitoringDelivery,
  type NotifiableMonitoringDelivery,
  snapshotDeliveredReviewMrids,
} from './monitoringDeliveries';
import { createNotification } from './notifications';
import { usersWithSetting } from './userSettings';

const { MonitoringReportDelivery } = db;

export { ACTIONABLE_NOTIFICATIONS_FLAG };

type MonitoringDataReceivedMetadata = NotificationMetadata & {
  recipientId: number;
  regionId: number;
};

export type MonitoringDeliveryNotificationSummary = {
  detected: number;
  recorded: number;
  inApp: number;
  emails: number;
};

export type RecordedMonitoringDelivery = NewMonitoringDelivery &
  NotifiableMonitoringDelivery & {
    // false when an earlier run already recorded this recipient/report/region
    created: boolean;
  };

/**
 * Records each delivery in MonitoringReportDeliveries, one row per recipient/report/region.
 * Rows already recorded by an earlier run are left as they are, which keeps a rerun from
 * notifying twice. The recorded rows also feed the monitoring digest.
 * @param {NewMonitoringDelivery[]} deliveries From `findNewlyDeliveredReviews()`.
 * @returns {Promise<RecordedMonitoringDelivery[]>} Every delivery with its row id, flagged with
 * whether this call created the row.
 */
export async function recordMonitoringDeliveries(
  deliveries: NewMonitoringDelivery[]
): Promise<RecordedMonitoringDelivery[]> {
  const recorded: RecordedMonitoringDelivery[] = [];
  for (const delivery of deliveries) {
    const [row, created] = await MonitoringReportDelivery.findOrCreate({
      where: {
        deliveredReviewId: delivery.deliveredReviewId,
        recipientId: delivery.recipientId,
        regionId: delivery.regionId,
      },
    });
    recorded.push({ ...delivery, monitoringDeliveryId: row.id, created });
  }
  return recorded;
}

/**
 * Creates the "new monitoring report" in-app notification (Misc-1a) for each user, keyed on
 * the MonitoringReportDelivery row so two recipients on one review never share a
 * notification, even with the same name. The user's in-app setting is applied by
 * `createNotification`, which also skips notifications that already exist, so a retry does
 * not duplicate them. A failure for one user is logged and does not stop the others.
 * @returns {Promise<{ count: number, failed: number }>} How many notifications were created or
 * already existed, and how many users failed.
 */
export async function createMonitoringDataReceivedNotifications(
  delivery: NotifiableMonitoringDelivery,
  users: MonitoringNotificationUser[]
): Promise<{ count: number; failed: number }> {
  const metadata: MonitoringDataReceivedMetadata = {
    recipientName: delivery.recipientName,
    recipientId: delivery.recipientId,
    regionId: delivery.regionId,
  };

  let count = 0;
  let failed = 0;
  for (const user of users) {
    try {
      const notification = await createNotification(
        user.id,
        delivery.monitoringDeliveryId,
        NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
        { metadata }
      );
      if (notification) {
        count += 1;
      }
    } catch (err) {
      failed += 1;
      auditLogger.error(
        `Error creating monitoring data received notification for user ${user.id}, monitoring delivery ${delivery.monitoringDeliveryId}, delivered review ${delivery.deliveredReviewId}, recipient ${delivery.recipientId}: ${err}`
      );
    }
  }
  return { count, failed };
}

/**
 * Returns the users whose monitoring email setting is "immediately". The default is "never",
 * so users without an override are left out. `usersWithSetting` also requires SITE_ACCESS.
 */
export async function usersWantingImmediateMonitoringEmail(
  users: MonitoringNotificationUser[]
): Promise<MonitoringNotificationUser[]> {
  if (!users.length) {
    return [];
  }
  const immediate = await usersWithSetting(EMAIL_ACTIONS.MONITORING_DETAILS_ADDED, [
    USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY,
  ]);
  const immediateIds = new Set(immediate.map(({ id }) => id));
  return users.filter(({ id }) => immediateIds.has(id));
}

/**
 * Notifies TTAC/ECM/GSM users in each delivery's home region, in-app and by immediate email.
 * Adds the counts to `summary`. The email is only sent once every in-app notification for the
 * delivery succeeded, so a retry after an in-app failure does not email twice.
 * @returns {Promise<number[]>} The MonitoringReportDelivery ids that were fully notified.
 */
async function sendMonitoringDeliveryNotifications(
  deliveries: NotifiableMonitoringDelivery[],
  summary: MonitoringDeliveryNotificationSummary
): Promise<number[]> {
  if (!deliveries.length) {
    return [];
  }

  const usersByRegion = await findMonitoringNotificationUsersByRegion(
    deliveries.map(({ regionId }) => regionId),
    ACTIONABLE_NOTIFICATIONS_FLAG
  );

  // one settings lookup covers every region
  const emailUsers = await usersWantingImmediateMonitoringEmail([...usersByRegion.values()].flat());
  const emailUsersByRegion = new Map<number, MonitoringNotificationUser[]>();
  emailUsers.forEach((user) => {
    emailUsersByRegion.set(user.homeRegionId, [
      ...(emailUsersByRegion.get(user.homeRegionId) ?? []),
      user,
    ]);
  });

  const notified: number[] = [];
  for (const delivery of deliveries) {
    const users = usersByRegion.get(delivery.regionId) ?? [];
    const { count, failed } = await createMonitoringDataReceivedNotifications(delivery, users);
    summary.inApp += count;
    if (failed) {
      continue;
    }

    const regionEmailUsers = emailUsersByRegion.get(delivery.regionId) ?? [];
    try {
      await monitoringDetailsAddedNotification(delivery, regionEmailUsers);
      summary.emails += regionEmailUsers.length;
      notified.push(delivery.monitoringDeliveryId);
    } catch (err) {
      auditLogger.error(
        `Error enqueuing monitoring details added emails for monitoring delivery ${delivery.monitoringDeliveryId}: ${err}`
      );
    }
  }
  return notified;
}

/**
 * Notifies TTAC/ECM/GSM users in the home region of every monitoring report delivered by the
 * latest refresh, in-app and by immediate email. Run after `updateMonitoringFactTables()` has
 * committed, passing the snapshot taken before it started.
 *
 * New deliveries are recorded in MonitoringReportDeliveries first. Then every recorded
 * delivery that is still pending is sent, including ones an earlier run could not finish, and
 * marked as notified once its in-app notifications are created and its emails are queued.
 *
 * An empty snapshot means DeliveredReviews was empty before the refresh (a fresh or rebuilt
 * database), so every review would look new. In that case nothing is recorded or sent.
 * @param {Set<number>} previouslyDeliveredMrids From `snapshotDeliveredReviewMrids()`.
 * @returns {Promise<MonitoringDeliveryNotificationSummary>} Counts for logging.
 */
export async function notifyNewMonitoringDeliveries(
  previouslyDeliveredMrids: Set<number>
): Promise<MonitoringDeliveryNotificationSummary> {
  const summary: MonitoringDeliveryNotificationSummary = {
    detected: 0,
    recorded: 0,
    inApp: 0,
    emails: 0,
  };

  if (!previouslyDeliveredMrids.size) {
    logger.info(
      'Monitoring delivery notifications: no delivered reviews before the refresh, treating it as an initial load and skipping notifications'
    );
    return summary;
  }

  const deliveries = await findNewlyDeliveredReviews(previouslyDeliveredMrids);
  summary.detected = deliveries.length;
  const recorded = await recordMonitoringDeliveries(deliveries);
  summary.recorded = recorded.filter(({ created }) => created).length;

  const pending = await findPendingMonitoringDeliveries();
  const notified = await sendMonitoringDeliveryNotifications(pending, summary);
  await markMonitoringDeliveriesNotified(notified);

  if (notified.length < pending.length) {
    auditLogger.error(
      `Monitoring delivery notifications: ${pending.length - notified.length} of ${pending.length} deliveries could not be fully notified and will be retried`
    );
  }
  logger.info(`Monitoring delivery notifications: ${JSON.stringify(summary)}`);
  return summary;
}

/**
 * Sends the delivery notifications for every monitoring report delivered yesterday or today,
 * as the daily refresh would. Unlike `notifyNewMonitoringDeliveries`, deliveries that were
 * already notified are sent again, so several people can test on the same day. Immediate
 * emails are resent; in-app notifications that already exist are not duplicated. Deliveries
 * are still recorded so they appear in the monitoring digest. Used by the admin email testing
 * page in non-production environments only.
 * @param {Date} [now] Defaults to the current time.
 * @returns {Promise<MonitoringDeliveryNotificationSummary>} Counts for logging.
 */
export async function notifyRecentMonitoringDeliveries(
  now: Date = new Date()
): Promise<MonitoringDeliveryNotificationSummary> {
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  // with a date cutoff an empty snapshot is fine: every review in it is recent, so none would
  // be wrongly treated as new
  const previouslyDeliveredMrids = await snapshotDeliveredReviewMrids(
    yesterday.toISOString().slice(0, 10)
  );

  const deliveries = await findNewlyDeliveredReviews(previouslyDeliveredMrids);
  const recorded = await recordMonitoringDeliveries(deliveries);
  const summary: MonitoringDeliveryNotificationSummary = {
    detected: deliveries.length,
    recorded: recorded.filter(({ created }) => created).length,
    inApp: 0,
    emails: 0,
  };
  const notified = await sendMonitoringDeliveryNotifications(recorded, summary);
  await markMonitoringDeliveriesNotified(notified);

  logger.info(`Recent monitoring delivery notifications: ${JSON.stringify(summary)}`);
  return summary;
}
