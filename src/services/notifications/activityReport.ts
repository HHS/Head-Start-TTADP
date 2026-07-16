import { NOTIFICATION_TYPES } from '../../constants';
import { createNotification } from './index';

const checkRecipientName = (activityRecipients: { name: string }[]): boolean => {
  return !!(activityRecipients || [])
    .map((r) => r.name)
    .join(', ')
    .trim();
};

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

export {
  createApproverSubmittedNotification,
  createCollaboratorSubmittedNotification,
  createNotificationForCollaborators,
};
