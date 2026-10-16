import { QueryTypes } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import db, { sequelize } from '../../models';
import type { NotificationType } from '../types/notifications';
import {
  archiveNotificationsByEntityAndType,
  archiveNotificationsByUserEntityAndType,
  createNotification,
} from './index';

const { ActivityRecipient, ActivityReport, Grant, OtherEntity, Program, Recipient } = db;

const checkRecipientName = (activityRecipients: { name: string }[]): boolean => {
  return !!(activityRecipients || [])
    .map((r) => r.name)
    .join(', ')
    .trim();
};

/**
 * Finds the program specialists assigned to grants included on an activity report.
 * FIXME: This email-based association is temporary until a direct specialist/grant relationship
 * exists. Related: TTAHUB-1253.
 */
async function programSpecialistsForReport(reportId: number): Promise<{ id: number }[]> {
  return sequelize.query<{ id: number }>(
    `
    SELECT DISTINCT u.id
    FROM "ActivityReports" a
    JOIN "ActivityRecipients" ar
    ON a.id = ar."activityReportId"
    JOIN "Grants" gr
    ON ar."grantId" = gr.id
    JOIN "Users" u
    ON LOWER(gr."programSpecialistEmail") = LOWER(u.email)
    WHERE a.id = :reportId
  `,
    { type: QueryTypes.SELECT, replacements: { reportId: Number(reportId) } }
  );
}

async function notifyProgramSpecialistsOfApprovedReport(reportId: number): Promise<void> {
  const report = await ActivityReport.findByPk(reportId, {
    attributes: ['id', 'regionId', 'legacyId'],
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: ['id', 'grantId', 'otherEntityId'],
        required: false,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: ['id', 'number', 'status'],
            required: false,
            include: [
              { model: Recipient, as: 'recipient', attributes: ['id', 'name'], required: false },
              {
                model: Program,
                as: 'programs',
                attributes: ['id', 'programType'],
                required: false,
              },
            ],
          },
          { model: OtherEntity, as: 'otherEntity', attributes: ['name'], required: false },
        ],
      },
    ],
  });

  if (!report) {
    throw new Error(`Activity report ${reportId} not found when notifying program specialists`);
  }

  const { id, displayId } = report;
  const activityRecipients = report.activityRecipients.map((recipient) => ({
    name: recipient.name,
  }));
  const programSpecialists = await programSpecialistsForReport(reportId);

  await createRecipientReportApprovedNotificationForProgramSpecialists(
    programSpecialists.map(({ id: userId }) => userId),
    {
      id,
      displayId,
      activityRecipients,
    }
  );
}

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
  let notificationType: NotificationType;
  if (creatorOrCollaborator === 'creator') {
    notificationType = NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION;
  } else if (creatorOrCollaborator === 'approver') {
    // Approver 1 is told a second+ approver requested changes (TTAHUB-5683).
    notificationType = NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_APPROVER;
  } else {
    notificationType = NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR;
  }

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

async function createCreatorSubmittedNotification(
  creatorUserId: number,
  savedReport: {
    id: number;
    displayId: string;
  },
  submitterName: string
) {
  return createNotification(
    creatorUserId,
    savedReport.id,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_CREATOR,
    {
      metadata: {
        id: savedReport.id,
        displayId: savedReport.displayId,
        author: submitterName,
      },
    }
  );
}

async function createReportApprovedNotification(
  creatorUserId: number,
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
  },
  approverName: string
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return createNotification(
    creatorUserId,
    savedReport.id,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
    {
      metadata: {
        id: savedReport.id,
        displayId: savedReport.displayId,
        recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
        approver: approverName,
      },
      skipExisting: 'archived',
    }
  );
}

/**
 * Creates the "report approved" in-app notification for each collaborator on an activity
 * report. Fired when an approver approves the report, naming the approver who just acted.
 * Mirrors {@link createReportApprovedNotification} (which notifies the creator) so that
 * collaborators also receive the approval notification.
 * @param currentCollaborators The report's collaborators to notify.
 * @param savedReport The saved activity report.
 * @param approverName The name of the approver who approved the report.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
async function createReportApprovedNotificationForCollaborators(
  currentCollaborators: { userId: number }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
  },
  approverName: string
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return Promise.all(
    currentCollaborators.map((collaborator) =>
      createNotification(
        collaborator.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
            approver: approverName,
          },
          skipExisting: 'archived',
        }
      )
    )
  );
}

/**
 * Creates the "another approver approved this report" in-app notification for each of the
 * report's other approvers. Fired on every approval, including the final approval,
 * naming the approver who just acted. The acting approver
 * is excluded by the caller. The CTA is conditional on whether the recipient has already
 * approved or marked the report as needs action: "Take action" (actionable) when they have
 * done neither, "View AR" once they have done either. (TTAHUB-5581)
 * @param otherApprovers The report's other approvers to notify, each flagged with whether
 * they have already approved or marked the report as needs action (`hasApproved`).
 * @param savedReport The saved activity report.
 * @param approverName The name of the approver who just approved the report.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
async function createReportApprovedNotificationForApprovers(
  otherApprovers: { userId: number; hasApproved: boolean }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
  },
  approverName: string
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  return Promise.all(
    otherApprovers.map((approver) =>
      createNotification(
        approver.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED_APPROVER,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
            approver: approverName,
            hasApproved: approver.hasApproved,
          },
          skipExisting: 'archived',
        }
      )
    )
  );
}

/**
 * Creates the "one of my recipients' activity reports is available" in-app notification for
 * each program specialist whose caseload includes a grant on the report. Fired when the report
 * reaches the APPROVED status.
 * @param programSpecialistIds The program specialists' user ids to notify.
 * @param savedReport The saved activity report.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
async function createRecipientReportApprovedNotificationForProgramSpecialists(
  programSpecialistIds: number[],
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
    programSpecialistIds.map((userId) =>
      createNotification(
        userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
          },
          skipExisting: 'archived',
        }
      )
    )
  );
}

/**
 * Archives the "another approver approved this report" in-app notifications for an activity
 * report. Called when the report is fully approved, changes are requested, or the report
 * is resubmitted so earlier approval notifications no longer remain active or get reused.
 * (TTAHUB-5581)
 * @param {number} reportId The activity report ID whose approver-approved notifications to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveApproverApprovedNotifications(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(reportId, [
    NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED_APPROVER,
  ]);
}

async function archiveRecipientReportApprovedNotifications(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(
    reportId,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED
  );
}

/**
 * Archives a single approver's "another approver approved this report" in-app notification
 * for an activity report. Called when that approver themselves approves the report, so the
 * notification nudging them to act is moved to their archived list. (TTAHUB-5581)
 * @param {number} reportId The activity report ID.
 * @param {number} userId The approver whose approver-approved notification to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveApproverApprovedNotificationForUser(
  reportId: number,
  userId: number
): Promise<void> {
  return archiveNotificationsByUserEntityAndType(
    reportId,
    userId,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED_APPROVER
  );
}

/**
 * Creates the "revised report resubmitted for approval" in-app notification for each
 * collaborator on an activity report. Fired when a report is resubmitted for approval
 * (i.e. submitted while it was in "needs action" status). Replaces the standard
 * collaborator-submitted notification on resubmission.
 * @param currentCollaborators The report's collaborators to notify.
 * @param savedReport The saved activity report.
 * @returns {Promise<void>} Resolves once notifications are created.
 */
async function createResubmittedNotificationForCollaborators(
  currentCollaborators: { userId: number }[],
  savedReport: {
    id: number;
    displayId: string;
    activityRecipients: { name: string }[];
  }
) {
  if (!checkRecipientName(savedReport.activityRecipients)) {
    return Promise.resolve();
  }

  await Promise.all(
    currentCollaborators.map((collaborator) =>
      createNotification(
        collaborator.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
          },
          skipExisting: 'archived',
        }
      )
    )
  );

  return Promise.all(
    currentCollaborators.map((collaborator) =>
      archiveNotificationsByUserEntityAndType(
        savedReport.id,
        collaborator.userId,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR
      )
    )
  );
}

/**
 * Creates the "revised report resubmitted for approval" in-app notification for each
 * approver on an activity report. Fired when a report is resubmitted for approval
 * (i.e. submitted while it was in "needs action" status), regardless of whether the
 * creator or a collaborator performed the resubmission. Replaces the standard
 * approver-submitted notification on resubmission (spec AR-4a / AR-5a).
 * @param currentApprovers The report's approvers to notify.
 * @param savedReport The saved activity report.
 * @returns {Promise<void>} Resolves once notifications are created and stale ones archived.
 */
async function createResubmittedNotificationForApprovers(
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

  await Promise.all(
    currentApprovers.map((approver) =>
      createNotification(
        approver.userId,
        savedReport.id,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_APPROVER,
        {
          metadata: {
            id: savedReport.id,
            displayId: savedReport.displayId,
            recipientName: (savedReport.activityRecipients || []).map((r) => r.name).join(', '),
          },
          skipExisting: 'archived',
        }
      )
    )
  );

  return Promise.all(
    currentApprovers.map((approver) =>
      archiveNotificationsByUserEntityAndType(
        savedReport.id,
        approver.userId,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED
      )
    )
  );
}

/**
 * Creates the "revised report resubmitted for approval" in-app notification for the creator
 * of an activity report. Fired when a collaborator (not the creator) resubmits a report for
 * approval (i.e. submitted while it was in "needs action" status). Replaces the standard
 * creator-submitted notification on resubmission so the creator sees the "revised" wording
 * (spec AR-4b / TTAHUB-5677).
 * @param creatorUserId The report creator's user id to notify.
 * @param savedReport The saved activity report.
 * @param submitterName The name of the collaborator who resubmitted the report.
 * @returns {Promise<void>} Resolves once the notification is created.
 */
async function createResubmittedNotificationForCreator(
  creatorUserId: number,
  savedReport: {
    id: number;
    displayId: string;
  },
  submitterName: string
) {
  await createNotification(
    creatorUserId,
    savedReport.id,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_CREATOR,
    {
      metadata: {
        id: savedReport.id,
        displayId: savedReport.displayId,
        author: submitterName,
      },
      skipExisting: 'archived',
    }
  );
  return archiveNotificationsByUserEntityAndType(
    savedReport.id,
    creatorUserId,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_CREATOR
  );
}

/**
 * Archives the "needs action" in-app notifications for an activity report.
 * Called when a report is (re)submitted for approval or fully approved so that any pending
 * needs-action notifications (creator-, collaborator-, and approver-facing) for that report
 * are moved to the archived list.
 * @param {number} reportId The activity report ID whose needs-action notifications to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveNeedsActionNotifications(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(reportId, [
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_APPROVER,
  ]);
}

/**
 * Archives the "revised report resubmitted" in-app notifications for an activity report.
 * Called when a report is approved or returned to "needs action" so that the resubmission
 * notifications (both collaborator- and approver-facing) for that report are moved to the
 * archived list.
 * @param {number} reportId The activity report ID whose resubmitted notifications to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveResubmittedNotifications(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(reportId, [
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_APPROVER,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_CREATOR,
  ]);
}

/**
 * Archives the in-app notifications that become obsolete once an activity report reaches
 * the APPROVED status. Called when the report transitions to APPROVED so that stale
 * submitted/collaborator-added/needs-action/resubmitted notifications for that report are
 * moved to the archived list. Deliberately excludes ACTIVITY_REPORT_APPROVED and
 * ACTIVITY_REPORT_APPROVED_APPROVER, since those are the notifications created by this same
 * event.
 * @param {number} reportId The activity report ID whose notifications to archive.
 * @returns {Promise<void>} Resolves once archiving is complete.
 */
async function archiveNotificationsOnActivityReportApproved(reportId: number): Promise<void> {
  return archiveNotificationsByEntityAndType(reportId, [
    NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_CREATOR,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_APPROVER,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_APPROVER,
    NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_CREATOR,
  ]);
}

export {
  archiveApproverApprovedNotificationForUser,
  archiveApproverApprovedNotifications,
  archiveNeedsActionNotifications,
  archiveNotificationsOnActivityReportApproved,
  archiveRecipientReportApprovedNotifications,
  archiveResubmittedNotifications,
  createApproverSubmittedNotification,
  createChangesRequestedNotification,
  createCollaboratorSubmittedNotification,
  createCreatorSubmittedNotification,
  createNotificationForCollaborators,
  createRecipientReportApprovedNotificationForProgramSpecialists,
  createReportApprovedNotification,
  createReportApprovedNotificationForApprovers,
  createReportApprovedNotificationForCollaborators,
  createResubmittedNotificationForApprovers,
  createResubmittedNotificationForCollaborators,
  createResubmittedNotificationForCreator,
  notifyProgramSpecialistsOfApprovedReport,
  programSpecialistsForReport,
};
