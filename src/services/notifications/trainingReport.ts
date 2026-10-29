import { NOTIFICATION_TYPES } from '../../constants';
import runInSavepoint from '../../lib/runInSavepoint';
import db from '../../models';
import Users from '../../policies/user';
import { REGIONAL_PD_WITH_NATIONAL_CENTERS } from '../eventFlow';
import { archiveNotificationsByEntityAndType, createNotification } from './index';

const ACTIONABLE_NOTIFICATIONS_FLAG = 'actionable_notifications';

/**
 * Creates the "added as a Regional point of contact" in-app notification (TR-1a) for each
 * newly added POC on a Training Report. Only applies to Regional PD events with National
 * Centers. The event owner and POCs who were already on the report are skipped, as are users
 * without the `actionable_notifications` feature flag. The user's in-app setting is applied
 * by `createNotification`.
 * @param event The saved Training Report (EventReportPilot).
 * @param previousPocIds The POC user ids before the save.
 * @param currentPocIds The POC user ids after the save.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
export async function createNotificationForNewPocs(
  event: { id: number; eventId: string; ownerId: number; data: { eventOrganizer?: string } },
  previousPocIds: number[] | null | undefined,
  currentPocIds: number[] | null | undefined
): Promise<void> {
  if (event.data?.eventOrganizer !== REGIONAL_PD_WITH_NATIONAL_CENTERS) {
    return;
  }

  const previous = new Set(previousPocIds ?? []);
  const newPocIds = [...new Set(currentPocIds ?? [])].filter(
    (pocId) => !previous.has(pocId) && pocId !== event.ownerId
  );

  if (!newPocIds.length) {
    return;
  }

  const users = await db.User.findAll({
    where: { id: newPocIds },
    attributes: ['id', 'flags'],
    include: [{ model: db.Permission, as: 'permissions' }],
  });

  const recipients = users.filter((user) =>
    new Users(user).canSeeBehindFeatureFlag(ACTIONABLE_NOTIFICATIONS_FLAG)
  );

  // one savepoint per recipient so a failure only skips that recipient; run sequentially
  // because concurrent savepoints on the same transaction connection would interleave
  for (const user of recipients) {
    await runInSavepoint(
      () =>
        createNotification(user.id, event.id, NOTIFICATION_TYPES.TRAINING_REPORT_POC_ADDED, {
          metadata: {
            displayId: event.eventId,
            id: event.id,
          },
          // a removed and re-added POC gets a new notification once they archived the old one
          skipExisting: 'archived',
        }),
      `Error creating POC added notification for user ${user.id} on event ${event.id}:`
    );
  }
}

/**
 * Creates the "session submitted for approval" in-app notification (TR-3c) for each Event
 * Collaborator on a Training Report. The event owner is skipped, as are users without the
 * `actionable_notifications` feature flag. The user's in-app setting is applied by
 * `createNotification`. Callers are responsible for only invoking this on a first submission;
 * resubmissions are covered by TR-5c.
 * @param event The Training Report (EventReportPilot) the session belongs to.
 * @param session The submitted session.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
export async function createNotificationForSessionSubmittedCollaborators(
  event: { eventId: string; ownerId: number; collaboratorIds: number[] | null | undefined },
  session: { id: number; data: { sessionName?: string } }
): Promise<void> {
  const collaboratorIds = [...new Set(event.collaboratorIds ?? [])].filter(
    (collaboratorId) => collaboratorId !== event.ownerId
  );

  if (!collaboratorIds.length) {
    return;
  }

  const users = await db.User.findAll({
    where: { id: collaboratorIds },
    attributes: ['id', 'flags'],
    include: [{ model: db.Permission, as: 'permissions' }],
  });

  const recipients = users.filter((user) =>
    new Users(user).canSeeBehindFeatureFlag(ACTIONABLE_NOTIFICATIONS_FLAG)
  );

  await Promise.all(
    recipients.map((user) =>
      createNotification(
        user.id,
        session.id,
        NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_SUBMITTED_COLLABORATOR,
        {
          metadata: {
            sessionName: session.data?.sessionName,
            displayId: event.eventId,
            id: session.id,
          },
        }
      )
    )
  );
}

/**
 * Creates the "approver requested changes to a session" in-app notification (TR-4a) for the
 * Event Creator (owner) of a Training Report. Skipped when the owner lacks the
 * `actionable_notifications` feature flag. The user's in-app setting is applied by
 * `createNotification`. An archived notification from an earlier round of changes does not
 * block a new one.
 * @param event The Training Report (EventReportPilot) the session belongs to.
 * @param session The session that changes were requested on.
 * @returns {Promise<void>} Resolves once the notification is created.
 */
export async function createSessionNeedsActionNotification(
  event: { eventId: string; ownerId: number },
  session: { id: number; approverId: number | null | undefined; data: { sessionName?: string } }
): Promise<void> {
  const [owner, approver] = await Promise.all([
    db.User.findOne({
      where: { id: event.ownerId },
      attributes: ['id', 'flags'],
      include: [{ model: db.Permission, as: 'permissions' }],
    }),
    session.approverId
      ? db.User.findOne({ where: { id: session.approverId }, attributes: ['name', 'fullName'] })
      : null,
  ]);

  if (!owner || !new Users(owner).canSeeBehindFeatureFlag(ACTIONABLE_NOTIFICATIONS_FLAG)) {
    return;
  }

  await createNotification(
    owner.id,
    session.id,
    NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
    {
      metadata: {
        approver: approver?.fullName || approver?.name,
        sessionName: session.data?.sessionName,
        displayId: event.eventId,
        id: session.id,
      },
      skipExisting: 'archived',
    }
  );
}

/**
 * Archives the "approver requested changes to a session" in-app notification (TR-4a) for a
 * session. Called when the session is resubmitted or deleted. Archiving points the link at
 * the Training Report; pass `removeLink` when the Training Report itself is being deleted.
 * @param sessionId The session whose needs action notifications to archive.
 * @param options.removeLink Clear the link instead of pointing it at the Training Report.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
export async function archiveSessionNeedsActionNotifications(
  sessionId: number,
  { removeLink = false }: { removeLink?: boolean } = {}
): Promise<void> {
  await archiveNotificationsByEntityAndType(sessionId, [
    NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
  ]);

  if (removeLink) {
    await db.Notification.update(
      { link: null },
      {
        where: {
          entityId: sessionId,
          type: NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
        },
      }
    );
  }
}
