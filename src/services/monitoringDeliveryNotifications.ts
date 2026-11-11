import type { NotificationMetadata } from '@ttahub/common/src/notifications';
import { EMAIL_ACTIONS, NOTIFICATION_TYPES, USER_SETTINGS } from '../constants';
import { monitoringDetailsAddedNotification } from '../lib/mailer';
import { auditLogger, logger } from '../logger';
import db from '../models';
import {
  findMonitoringNotificationUsersByRegion,
  findNewlyDeliveredReviews,
  type MonitoringNotificationUser,
  type NewMonitoringDelivery,
} from './monitoringDeliveries';
import { createNotification } from './notifications';
import { userSettingOverridesById } from './userSettings';

const { MonitoringReportDelivery } = db;

export const ACTIONABLE_NOTIFICATIONS_FLAG = 'actionable_notifications';

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

/**
 * Records each delivery in MonitoringReportDeliveries and returns only the ones that were
 * not already recorded. This keeps a rerun from notifying twice about the same
 * recipient/report, and the recorded rows feed the monitoring digest.
 * @param {NewMonitoringDelivery[]} deliveries From `findNewlyDeliveredReviews()`.
 * @returns {Promise<NewMonitoringDelivery[]>} The deliveries recorded by this call.
 */
export async function recordMonitoringDeliveries(
  deliveries: NewMonitoringDelivery[]
): Promise<NewMonitoringDelivery[]> {
  const recorded: NewMonitoringDelivery[] = [];
  for (const delivery of deliveries) {
    const [, created] = await MonitoringReportDelivery.findOrCreate({
      where: { deliveredReviewId: delivery.deliveredReviewId, recipientId: delivery.recipientId },
      defaults: { regionId: delivery.regionId },
    });
    if (created) {
      recorded.push(delivery);
    }
  }
  return recorded;
}

/**
 * Creates the "new monitoring report" in-app notification (Misc-1a) for each user. The user's
 * in-app setting is applied by `createNotification`. A failure for one user is logged and
 * does not stop the others.
 * @returns {Promise<number>} How many notifications were created or already existed.
 */
export async function createMonitoringDataReceivedNotifications(
  delivery: NewMonitoringDelivery,
  users: MonitoringNotificationUser[]
): Promise<number> {
  const metadata: MonitoringDataReceivedMetadata = {
    recipientName: delivery.recipientName,
    recipientId: delivery.recipientId,
    regionId: delivery.regionId,
  };

  let count = 0;
  for (const user of users) {
    try {
      const notification = await createNotification(
        user.id,
        delivery.deliveredReviewId,
        NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
        { metadata }
      );
      if (notification) {
        count += 1;
      }
    } catch (err) {
      auditLogger.error(
        `Error creating monitoring data received notification for user ${user.id}, delivered review ${delivery.deliveredReviewId}, recipient ${delivery.recipientId}: ${err}`
      );
    }
  }
  return count;
}

/**
 * Returns the users whose monitoring email setting is "immediately". The default is "never",
 * so users without an override are left out.
 */
export async function usersWantingImmediateMonitoringEmail(
  users: MonitoringNotificationUser[]
): Promise<MonitoringNotificationUser[]> {
  const settings = await Promise.all(
    users.map((user) => userSettingOverridesById(user.id, EMAIL_ACTIONS.MONITORING_DETAILS_ADDED))
  );
  return users.filter((_user, i) => settings[i]?.value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY);
}

/**
 * Notifies TTAC/ECM/GSM users in the home region of every monitoring report delivered by the
 * latest refresh, in-app and by immediate email. Run after `updateMonitoringFactTables()` has
 * committed, passing the snapshot taken before it started.
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
  summary.recorded = recorded.length;

  if (recorded.length) {
    const usersByRegion = await findMonitoringNotificationUsersByRegion(
      recorded.map(({ regionId }) => regionId),
      ACTIONABLE_NOTIFICATIONS_FLAG
    );

    // users are the same for every delivery in a region, so look up email settings once each
    const emailUsersByRegion = new Map<number, MonitoringNotificationUser[]>();
    for (const [regionId, users] of usersByRegion) {
      emailUsersByRegion.set(regionId, await usersWantingImmediateMonitoringEmail(users));
    }

    for (const delivery of recorded) {
      const users = usersByRegion.get(delivery.regionId) ?? [];
      summary.inApp += await createMonitoringDataReceivedNotifications(delivery, users);

      const emailUsers = emailUsersByRegion.get(delivery.regionId) ?? [];
      monitoringDetailsAddedNotification(delivery, emailUsers);
      summary.emails += emailUsers.length;
    }
  }

  logger.info(`Monitoring delivery notifications: ${JSON.stringify(summary)}`);
  return summary;
}
