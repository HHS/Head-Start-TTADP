import { Op } from 'sequelize';
import { DIGEST_SUBJECT_FREQ, EMAIL_ACTIONS, EMAIL_DIGEST_FREQ } from '../constants';
import { frequencyToInterval, notifyDigest, notifyMonitoringDetailsAdded } from '../lib/mailer';
import db from '../models';
import {
  type MonitoringDigestRecipient,
  monitoringReportsDeliveredInRegionByDate,
} from '../services/monitoringDeliveries';

const { DeliveredReview, Grant, Recipient, User } = db;

// Lower deployed environments (dev-*, staging) and local development. Production's
// TTA_SMART_HUB_URI (ttahub.ohs.acf.hhs.gov) and anything unrecognized are refused.
const ALLOWED_HOSTS = [
  /^tta-smarthub-dev-[a-z0-9-]+\.app\.cloud\.gov$/,
  /^tta-smarthub-staging\.app\.cloud\.gov$/,
];
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

export type DigestFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type SendTestMonitoringNotificationsOptions = {
  userIds: number[];
  type: 'immediate' | 'digest' | 'both';
  freq: DigestFrequency;
  deliveredReviewId?: number;
};

export type SentEmail = {
  kind: 'immediate' | 'digest';
  userId: number;
  email: string;
  sent: boolean;
  detail: string;
};

/**
 * Throws unless this is a lower environment. Uses an allowlist on TTA_SMART_HUB_URI so a
 * missing or unexpected value is refused, and also refuses any cloud.gov space named prod.
 */
export function assertLowerEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const space = env.SPACE ?? '';
  if (space.toLowerCase().includes('prod')) {
    throw new Error(`Refusing to send test monitoring notifications in space "${space}".`);
  }

  let host = '';
  try {
    host = new URL(env.TTA_SMART_HUB_URI ?? '').hostname;
  } catch {
    // fall through to the refusal below
  }

  const isLocal = LOCAL_HOSTS.includes(host) && !env.VCAP_APPLICATION;
  if (!isLocal && !ALLOWED_HOSTS.some((pattern) => pattern.test(host))) {
    throw new Error(
      `Refusing to send test monitoring notifications: TTA_SMART_HUB_URI host "${host}" is not a dev or staging environment.`
    );
  }
}

type ReviewRecipient = { recipientId: number; recipientName: string; regionId: number };

/**
 * Picks the delivered review to use: the one requested, or the most recently delivered
 * review that has a recipient. Returns its recipients.
 */
async function loadReview(deliveredReviewId?: number) {
  const review = await DeliveredReview.findOne({
    attributes: ['id', 'mrid', 'review_name', 'report_delivery_date'],
    where: {
      report_delivery_date: { [Op.ne]: null },
      ...(deliveredReviewId ? { id: deliveredReviewId } : {}),
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
    order: [
      ['report_delivery_date', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  if (!review) {
    throw new Error(
      deliveredReviewId
        ? `Delivered review ${deliveredReviewId} not found, not delivered, or has no grants.`
        : 'No delivered review with grants found.'
    );
  }

  const recipients = new Map<number, ReviewRecipient>();
  review.grants.forEach((grant) => {
    if (grant.recipientId && !recipients.has(grant.recipientId)) {
      recipients.set(grant.recipientId, {
        recipientId: grant.recipientId,
        recipientName: grant.recipient?.name ?? '',
        regionId: grant.regionId,
      });
    }
  });

  return { review, recipients: [...recipients.values()] };
}

/**
 * Sends the monitoring emails (TTAHUB-6004 immediate, TTAHUB-6062 digest) to the given users
 * right away, without the queue and regardless of their settings, role or home region, so
 * the emails can be checked in dev and staging. The immediate email goes out once per
 * recipient on the chosen review. The digest uses the user's real digest data when there is
 * any, and otherwise lists the chosen review's recipients.
 */
export async function sendTestMonitoringNotifications({
  userIds,
  type,
  freq,
  deliveredReviewId,
}: SendTestMonitoringNotificationsOptions): Promise<SentEmail[]> {
  assertLowerEnvironment();

  if (!userIds.length) {
    throw new Error('At least one --userId is required.');
  }
  if (process.env.SEND_NOTIFICATIONS !== 'true') {
    throw new Error(
      'SEND_NOTIFICATIONS is not "true" in this environment, so no email would be sent.'
    );
  }

  const users = await User.findAll({ attributes: ['id', 'name', 'email'], where: { id: userIds } });
  const missing = userIds.filter((id) => !users.some((u) => u.id === id));
  if (missing.length) {
    throw new Error(`Users not found: ${missing.join(', ')}`);
  }

  const { review, recipients } = await loadReview(deliveredReviewId);
  const results: SentEmail[] = [];

  for (const user of users) {
    const jobUser = { id: user.id, name: user.name, email: user.email };

    if (type === 'immediate' || type === 'both') {
      for (const recipient of recipients) {
        const result = await notifyMonitoringDetailsAdded({
          data: {
            report: {
              id: review.id,
              displayId: `monitoring report for ${recipient.recipientName}`,
            },
            user: jobUser,
            ...recipient,
          },
        });
        results.push({
          kind: 'immediate',
          userId: user.id,
          email: user.email,
          sent: result != null,
          detail: `review ${review.id} (${review.review_name ?? `mrid ${review.mrid}`}), recipient ${recipient.recipientName}`,
        });
      }
    }

    if (type === 'digest' || type === 'both') {
      const date = frequencyToInterval(EMAIL_DIGEST_FREQ[freq]);
      let reports: MonitoringDigestRecipient[] = await monitoringReportsDeliveredInRegionByDate(
        user.id,
        date
      );
      let source = 'the user’s digest data';
      if (!reports.length) {
        reports = recipients
          .map(({ recipientId, recipientName }) => ({ id: recipientId, displayId: recipientName }))
          .sort((a, b) => a.displayId.localeCompare(b.displayId));
        source = `review ${review.id}'s recipients (the user had no digest data)`;
      }

      const result = await notifyDigest({
        data: {
          user: jobUser,
          reports,
          type: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
          freq: EMAIL_DIGEST_FREQ[freq],
          subjectFreq: DIGEST_SUBJECT_FREQ[freq],
        },
      });
      results.push({
        kind: 'digest',
        userId: user.id,
        email: user.email,
        sent: result != null,
        detail: `${DIGEST_SUBJECT_FREQ[freq]} digest listing ${reports.length} recipient(s) from ${source}`,
      });
    }
  }

  return results;
}
