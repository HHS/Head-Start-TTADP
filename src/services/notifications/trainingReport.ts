import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import Users from '../../policies/user';
import { createNotification } from './index';

const ACTIONABLE_NOTIFICATIONS_FLAG = 'actionable_notifications';

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
