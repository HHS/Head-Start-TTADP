import { NOTIFICATION_TYPES } from '../../constants';
import { archiveNotificationsByEntityAndType, createNotification } from './index';

const checkRecipientName = (activityRecipients: { name: string }[]): boolean => {
  return !!(activityRecipients || [])
    .map((r) => r.name)
    .join(', ')
    .trim();
};

async function createChangesRequestedNotification(
  notificationRecipient: { userId: number },
  creatorOrCollaborator: 'creator' | 'collaborator' | 'approver',
  savedReport: {
    id: number;
    displayId: string;
    approver: { user: { name: string } };
    activityRecipients: { name: string }[];
  }
) {
  const notificationType =
    creatorOrCollaborator === 'creator'
      ? NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION
      : NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR;
  // collaborator type == approver type notification, functionally

  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return createNotification(notificationRecipient.userId, savedReport.id, notificationType, {
    metadata: {
      id: savedReport.id,
      displayId: savedReport.displayId,
      recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
      approver: savedReport.approver.user.name,
    },
    skipExisting: 'archived',
  });
}

async function createNotificationForCollaborators(
  currentCollaborators: { userId: number }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
    author: { name: string };
  }
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return Promise.all(
    currentCollaborators.map((collaborator) =>
      createNotification(
        collaborator.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            author: savedReport.author.name,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
          },
        }
      )
    )
  );
}

async function createApproverSubmittedNotification(
  currentApprovers: { userId: number }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
  }
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return Promise.all(
    currentApprovers.map((approver) =>
      createNotification(
        approver.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
          },
        }
      )
    )
  );
}

async function createCollaboratorSubmittedNotification(
  currentCollaborators: { userId: number }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
    author: { name: string };
  }
) {
  return Promise.all(
    currentCollaborators.map((approver) =>
      createNotification(
        approver.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            author: savedReport.author.name,
          },
        }
      )
    )
  );
}

/**
 * Archives the "needs action" in-app notifications for an activity report.
 * Called when a report is (re)submitted for approval so that any pending needs-action
 * notifications for that report are moved to the archived list.
 * @param {number} reportId The activity report ID whose needs-action notifications to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveNeedsActionNotifications(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(reportId, [
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR,
  ]);
}

export {
  archiveNeedsActionNotifications,
  createApproverSubmittedNotification,
  createChangesRequestedNotification,
  createCollaboratorSubmittedNotification,
  createNotificationForCollaborators,
};
