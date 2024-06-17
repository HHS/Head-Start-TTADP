import stringify from 'csv-stringify/lib/sync';
import { QueryTypes } from 'sequelize';
import {
  APPROVER_STATUSES,
  REPORT_STATUSES,
  DECIMAL_BASE,
} from '@ttahub/common';
import { USER_SETTINGS } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import {
  ActivityReport as ActivityReportModel,
  Role,
  ActivityReportApprover,
  User as UserModel,
  ActivityReportGoal,
  sequelize,
} from '../../models';
import ActivityReport from '../../policies/activityReport';
import User from '../../policies/user';
import {
  possibleRecipients,
  activityReportAndRecipientsById,
  createOrUpdate,
  activityReports,
  setStatus,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReportAlerts,
  getAllDownloadableActivityReports,
  activityReportsForCleanup,
} from '../../services/activityReports';
import { saveObjectivesForReport, getObjectivesByReportId } from '../../services/objectives';
import { upsertApprover, syncApprovers } from '../../services/activityReportApprovers';
import { goalsForGrants, setActivityReportGoalAsActivelyEdited } from '../../goalServices/goals';
import { userById, usersWithPermissions } from '../../services/users';
import { getUserReadRegions, setReadRegions } from '../../services/accessValidation';
import { logger } from '../../logger';
import {
  approverAssignedNotification,
  changesRequestedNotification,
  reportApprovedNotification,
  collaboratorAssignedNotification,
  programSpecialistRecipientReportApprovedNotification,
} from '../../lib/mailer';
import { activityReportToCsvRecord, extractListOfGoalsAndObjectives } from '../../lib/transform';
import { userSettingOverridesById } from '../../services/userSettings';
import { currentUserId } from '../../services/currentUser';
import { groupsByRegion } from '../../services/groups';

const { APPROVE_REPORTS } = SCOPES;

const namespace = 'SERVICE:ACTIVITY_REPORTS';

const logContext = {
  namespace,
};

export const LEGACY_WARNING = 'Reports done before March 17, 2021 may have blank fields. These were done in a SmartSheet, not the TTA Hub.';

async function sendActivityReportCSV(reports, res) {
  const csvRows = await Promise.all(reports.map((r) => activityReportToCsvRecord(r)));

  // base options
  let options = {
    header: true,
    quoted: true,
    quoted_empty: true,
  };

  let warning = '';

  // if we have some rows, we need to extract a list of goals and objectives and format the columns
  if (csvRows.length > 0) {
    const goalsAndObjectives = extractListOfGoalsAndObjectives(csvRows);

    options = {
      ...options,
      columns: [
        {
          key: 'displayId',
          header: 'Report ID',
        },
        {
          key: 'creatorName',
          header: 'Creator',
        },
        {
          key: 'collaborators',
          header: 'Collaborators',
        },
        {
          key: 'approvers',
          header: 'Approvers',
        },
        {
          key: 'programSpecialistName',
          header: 'Program Specialists',
        },
        {
          key: 'requester',
          header: 'Requester',
        },
        {
          key: 'activityRecipientType',
          header: 'Recipient or other entity',
        },
        {
          key: 'activityRecipients',
          header: 'Recipient name/other entity name',
        },
        {
          key: 'programTypes',
          header: 'Program types',
        },
        {
          key: 'reason',
          header: 'Reason',
        },
        {
          key: 'targetPopulations',
          header: 'Target population',
        },
        {
          key: 'startDate',
          header: 'Start date',
        },
        {
          key: 'endDate',
          header: 'End date',
        },
        {
          key: 'ttaType',
          header: 'TTA type',
        },
        {
          key: 'deliveryMethod',
          header: 'Delivery method',
        },
        {
          key: 'virtualDeliveryType',
          header: 'Virtual delivery type',
        },
        {
          key: 'duration',
          header: 'Duration',
        },
        {
          key: 'participants',
          header: 'Participant roles',
        },
        {
          key: 'numberOfParticipants',
          header: 'Number of participants',
        },
        {
          key: 'files',
          header: 'Attachments',
        },
        {
          key: 'context',
          header: 'Context',
        },
        ...goalsAndObjectives.map((objective) => (
          {
            key: objective,
            // capitalize each word and space them out (no '-' in there)
            header: objective.split('-').map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`).join(' '),
          })),
        {
          key: 'specialistNextSteps',
          header: 'Specialist next steps',
        },
        {
          key: 'specialistNextStepsCompleteDate',
          header: 'Specialist next steps anticipated completion date',
        },
        {
          key: 'recipientNextSteps',
          header: 'Recipient next steps',
        },
        {
          key: 'recipientNextStepsCompleteDate',
          header: 'Recipient next steps anticipated completion date',
        },
        {
          key: 'createdAt',
          header: 'Created date',
        },
        {
          key: 'submittedDate',
          header: 'Submitted date',
        },
        {
          key: 'approvedAt',
          header: 'Approved date',
        },
        {
          key: 'lastSaved',
          header: 'Last saved',
        },
        {
          key: 'recipientInfo',
          header: 'Recipient name - Grant number - Recipient ID',
        },
        {
          key: 'topics',
          header: 'Legacy Topics covered',
        },
        {
          key: 'ECLKCResourcesUsed',
          header: 'Legacy ECLKC resources',
        },
        {
          key: 'nonECLKCResourcesUsed',
          header: 'Legacy Non-ECLKC resources',
        },
        {
          key: 'files',
          header: 'Legacy Attachments',
        },
        {
          key: 'stateCode',
          header: 'State code',
        },
      ],
    };

    warning = `"${LEGACY_WARNING}"${options.columns.map(() => ',')}`;
    warning = `${warning.substring(0, warning.length - 1)}\n`;
  }

  const csvData = stringify(
    csvRows,
    options,
  );

  res.attachment('activity-reports.csv');
  res.send(`\ufeff${warning}${csvData}`);
}

export async function updateLegacyFields(req, res) {
  try {
    const { legacyReportId } = req.params;
    const report = await activityReportByLegacyId(legacyReportId);
    if (!report) {
      res.sendStatus(404);
      return;
    }
    // no authorization here because the entire route is only available to admins
    const imported = { ...report.imported, ...req.body };
    logger.debug(`Saving new data: ${JSON.stringify(imported, null, 2)}`);

    const savedReport = await createOrUpdate({ imported }, report);
    res.json(savedReport);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getLegacyReport(req, res) {
  try {
    const { legacyReportId } = req.params;
    const report = await activityReportByLegacyId(legacyReportId);
    if (!report) {
      res.sendStatus(404);
      return;
    }
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canViewLegacy()) {
      res.sendStatus(403);
      return;
    }
    res.json(report);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Gets all goals for any number of grants for use in an activity report
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getGoals(req, res) {
  try {
    const { grantIds } = req.query;
    const goals = await goalsForGrants(grantIds);
    res.json(goals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Save Objectives for non-entity Reports.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function saveOtherEntityObjectivesForReport(req, res) {
  const { objectivesWithoutGoals, activityReportId, region } = req.body;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new User(user);

  if (!authorization.canWriteInRegion(parseInt(region, DECIMAL_BASE))) {
    res.sendStatus(403);
    return;
  }
  try {
    const report = await ActivityReportModel.findByPk(activityReportId);
    await saveObjectivesForReport(objectivesWithoutGoals, report);
    const updatedObjectives = await getObjectivesByReportId(activityReportId);
    res.json(updatedObjectives);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Gets all users that have approve permissions for the current user's
 * regions.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getApprovers(req, res) {
  const { region } = req.query;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new User(user);

  if (!authorization.canViewUsersInRegion(parseInt(region, DECIMAL_BASE))) {
    res.sendStatus(403);
    return;
  }

  try {
    const users = await usersWithPermissions([region], [APPROVE_REPORTS]);
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Gets all groups that are shared for this user in the region.
 * regions.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getGroups(req, res) {
  const { region } = req.query;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new User(user);
  const regionNumber = parseInt(region, DECIMAL_BASE);
  if (!authorization.canWriteInRegion(regionNumber)) {
    res.sendStatus(403);
    return;
  }

  try {
    // Get groups for shared users and region.
    // TODO: Add a optional check for shared users.
    const groups = await groupsByRegion(regionNumber, userId);

    res.json(groups);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Checks if author and collaborators and program specialists
 * are subscribed to the immediate notifications.
 *
 * @param {*} report - activity report
 * @param {*} setting - a setting object with "key" and "value" keys
 * @returns {Promise<Array>} - an array containing an author and collaborators that subscribe
 */
async function checkEmailSettings(report, setting) {
  const { author, activityReportCollaborators } = report;

  const settingForAuthor = author ? (await userSettingOverridesById(author.id, setting))
    : null;

  const authorWithSetting = (settingForAuthor
    && settingForAuthor.value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY)
    ? author : null;

  const settingsForAllCollabs = activityReportCollaborators
    ? (await Promise.all(activityReportCollaborators.map(
      (c) => userSettingOverridesById(
        c.userId,
        setting,
      ),
    ))) : [];

  const collabsWithSettings = activityReportCollaborators
    ? activityReportCollaborators.filter((_value, index) => {
      if (!settingsForAllCollabs[index]) {
        return false;
      }
      return settingsForAllCollabs[index].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
    }) : [];

  // FIXME: This should be temporary until we have a solid relationship between
  // program specialists and grants.
  // Related: TTAHUB-1253
  let programSpecialistsToNotify = await sequelize.query(`
    SELECT DISTINCT u.id
    FROM "ActivityReports" a
    JOIN "ActivityRecipients" ar
    ON a.id = ar."activityReportId"
    JOIN "Grants" gr
    ON ar."grantId" = gr.id
    JOIN "Users" u
    ON LOWER(gr."programSpecialistEmail") = LOWER(u.email)
    WHERE a.id = ${report.id}
  `, { type: QueryTypes.SELECT });

  // For each program specialist ID number, I want to make sure they
  // are subscribed to immediate notifications given the `setting` key.
  programSpecialistsToNotify = await Promise.all(programSpecialistsToNotify.map(async (ps) => {
    const settingForPS = await userSettingOverridesById(ps.id, setting);
    if (settingForPS && settingForPS.value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY) {
      return ps;
    }
    return null;
  }));

  // Filter out null values.
  programSpecialistsToNotify = programSpecialistsToNotify.filter((ps) => ps);

  // The remaining program specialists are subscribed to immediate notifications for this given key.
  // Convert <Array<{ id: number }>> to <Array<User>>.
  programSpecialistsToNotify = await Promise.all(
    programSpecialistsToNotify.map(async (ps) => userById(ps.id)),
  );

  return [authorWithSetting, collabsWithSettings, programSpecialistsToNotify];
}
/**
 * Review a report, setting Approver status to approved or needs action
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function reviewReport(req, res) {
  try {
    const { activityReportId } = req.params;
    const { status, note } = req.body;
    const userId = await currentUserId(req, res);

    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canReview()) {
      res.sendStatus(403);
      return;
    }

    const savedApprover = await upsertApprover({
      status,
      note,
      activityReportId,
      userId,
    });

    const [
      reviewedReport,
      activityRecipients,
    ] = await activityReportAndRecipientsById(activityReportId);

    if (reviewedReport.calculatedStatus === REPORT_STATUSES.APPROVED) {
      const [authorWithSetting, collabsWithSettings] = await checkEmailSettings(
        reviewedReport,
        USER_SETTINGS.EMAIL.KEYS.APPROVAL,
      );
      reportApprovedNotification(reviewedReport, authorWithSetting, collabsWithSettings);

      // Notify program specialists of this approval if they
      // have a grant recipient associated with this report.
      const [, , programSpecialists] = await checkEmailSettings(
        reviewedReport,
        USER_SETTINGS.EMAIL.KEYS.RECIPIENT_APPROVAL,
      );

      programSpecialistRecipientReportApprovedNotification(
        report,
        programSpecialists,
        activityRecipients,
      );
    }

    if (reviewedReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
      const [authorWithSetting, collabsWithSettings] = await checkEmailSettings(
        reviewedReport,
        USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED,
      );
      changesRequestedNotification(
        reviewedReport,
        savedApprover,
        authorWithSetting,
        collabsWithSettings,
      );
    }

    res.json(savedApprover);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function resetToDraft(req, res) {
  try {
    const { activityReportId } = req.params;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(activityReportId);
    const authorization = new ActivityReport(user, report);

    const canReset = authorization.canReset();
    const isApproverAndCreator = authorization.isApproverAndCreator();

    if (!isApproverAndCreator && !canReset) {
      res.sendStatus(403);
      return;
    }

    if (isApproverAndCreator) {
      // Reset all Approving Managers to null status.
      await ActivityReportApprover.update({ status: null }, {
        where: { activityReportId },
        individualHooks: true,
      });
    }

    const [
      savedReport, activityRecipients, goalsAndObjectives, objectivesWithoutGoals,
    ] = await setStatus(report, REPORT_STATUSES.DRAFT);

    res.json({
      ...savedReport.dataValues,
      displayId: report.displayId,
      activityRecipients,
      goalsAndObjectives,
      objectivesWithoutGoals,
    });
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Mark activity report submissionStatus as deleted
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function softDeleteReport(req, res) {
  try {
    const { activityReportId } = req.params;

    const [report] = await activityReportAndRecipientsById(activityReportId);
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canDelete()) {
      res.sendStatus(403);
      return;
    }

    await setStatus(report, REPORT_STATUSES.DELETED);
    res.sendStatus(204);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Mark activity report submissionStatus as needs_action
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function unlockReport(req, res) {
  try {
    const { activityReportId } = req.params;
    const [report] = await activityReportAndRecipientsById(activityReportId);
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new ActivityReport(user, report);
    if (!authorization.canUnlock()) {
      res.sendStatus(403);
      return;
    }

    // Unlocking resets all Approving Managers to NEEDS_ACTION status.
    await ActivityReportApprover.update({ status: APPROVER_STATUSES.NEEDS_ACTION }, {
      where: { activityReportId },
      individualHooks: true,
    });

    res.sendStatus(204);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Submit a report to managers for approval
 * @param {*} req - request
 * @param {*} res - response
 */
export async function submitReport(req, res) {
  try {
    const { activityReportId } = req.params;
    const { approverUserIds, additionalNotes, creatorRole } = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    // Update Activity Report notes and submissionStatus
    const savedReport = await createOrUpdate({
      additionalNotes,
      creatorRole,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
    }, report);

    // Create, restore or destroy this report's approvers
    const currentApprovers = await syncApprovers(activityReportId, approverUserIds);

    const settingsForAllCurrentApprovers = await Promise.all(currentApprovers.map(
      (a) => userSettingOverridesById(
        a.userId,
        USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW,
      ),
    ));
    const currentApproversWithSettings = currentApprovers.filter((_value, index) => {
      if (!settingsForAllCurrentApprovers[index]) {
        return false;
      }
      return settingsForAllCurrentApprovers[index].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
    });
    // This will send notification to everyone marked as an approver.
    // This may need to be adjusted in future to only send notification to
    // approvers who are not in approved status.
    approverAssignedNotification(savedReport, currentApproversWithSettings);

    // Resubmitting resets any needs_action status to null ("pending" status)
    await ActivityReportApprover.update({ status: null }, {
      where: { status: APPROVER_STATUSES.NEEDS_ACTION, activityReportId },
      individualHooks: true,
    });

    // on submit, we should inform the backend that we
    // are no longer editing any goals (since we are submitting)
    await ActivityReportGoal.update({
      isActivelyEdited: false,
    }, {
      where: { activityReportId },
      individualHooks: true,
    });

    const response = await ActivityReportModel.findByPk(activityReportId, {
      attributes: ['id', 'calculatedStatus'],
      include: [
        {
          model: ActivityReportApprover,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: UserModel,
              as: 'user',
              attributes: ['id', 'name', 'fullName'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
            },
          ],
        },
      ],
    });
    res.json(response);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getActivityRecipients(req, res) {
  const { region } = req.query;
  const targetRegion = parseInt(region, DECIMAL_BASE);
  const activityRecipients = await possibleRecipients(targetRegion);
  res.json(activityRecipients);
}

/**
 * Retrieve an activity report
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReport(req, res) {
  const { activityReportId } = req.params;
  const [
    report, activityRecipients, goalsAndObjectives, objectivesWithoutGoals,
  ] = await activityReportAndRecipientsById(activityReportId);
  if (!report) {
    res.sendStatus(404);
    return;
  }
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new ActivityReport(user, report);

  if (!authorization.canGet()) {
    res.sendStatus(403);
    return;
  }
  res.json({
    ...report.dataValues,
    displayId: report.displayId,
    activityRecipients,
    goalsAndObjectives,
    objectivesWithoutGoals,
  });
}

/**
 * Retrieve activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReports(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const reportsWithCount = await activityReports(query, false, userId);
  if (!reportsWithCount) {
    res.sendStatus(404);
  } else {
    res.json(reportsWithCount);
  }
}

/**
 * Retrieve activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReportsByManyIds(req, res) {
  try {
    const userId = await currentUserId(req, res);

    const {
      reportIds, offset, sortBy, sortDir, limit,
    } = req.body;

    // this will return a query with region parameters based
    // on the req user's permissions
    const query = await setReadRegions({
      offset,
      sortBy,
      sortDir,
      limit,
    }, userId);

    const reportsWithCount = await activityReports(query, false, userId, reportIds);
    if (!reportsWithCount) {
      res.sendStatus(404);
    } else {
      res.json(reportsWithCount);
    }
  } catch (err) {
    await handleErrors(req, res, err, logContext);
  }
}

/**
 * Retrieve activity report alerts
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReportAlerts(req, res) {
  const userId = await currentUserId(req, res);
  const alertsWithCount = await activityReportAlerts(userId, req.query);

  if (!alertsWithCount) {
    res.sendStatus(404);
  } else {
    res.json({
      alertsCount: alertsWithCount.count,
      alerts: alertsWithCount.rows,
      recipients: alertsWithCount.recipients,
    });
  }
}

/**
 * Retrieve activity report alerts
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReportsForLocalStorageCleanup(req, res) {
  const userId = await currentUserId(req, res);
  const reportsToCleanup = await activityReportsForCleanup(userId);

  if (!reportsToCleanup) {
    res.sendStatus(404);
  } else {
    res.json(reportsToCleanup);
  }
}

/**
 * save an activity report
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function saveReport(req, res) {
  try {
    const newReport = req.body;
    if (!newReport) {
      res.sendStatus(400);
      return;
    }
    const userId = await currentUserId(req, res);
    const { activityReportId } = req.params;
    const [report, activityRecipients] = await activityReportAndRecipientsById(activityReportId);
    if (!report) {
      res.sendStatus(404);
      return;
    }
    const user = await userById(userId);
    const authorization = new ActivityReport(user, report);
    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    newReport.lastUpdatedById = userId;

    // we don't want to pass in objectives without goals here, as the format
    // expected for that save function is different than the format expected
    // in saveObjectivesForReport
    const { objectivesWithoutGoals, ...existingReport } = report.dataValues;

    // join the updated report with the model object retrieved from the API
    // since we may not get all fields in the request body
    const savedReport = await createOrUpdate({
      ...existingReport, activityRecipients, ...newReport,
    }, report);

    if (savedReport.activityReportCollaborators) {
      // only include collaborators that aren't already in the report
      const newCollaborators = savedReport.activityReportCollaborators.filter((c) => {
        const oldCollaborators = report.activityReportCollaborators.map((x) => x.user.email);
        return !oldCollaborators.includes(c.user.email);
      });

      const settingsForAllCollabs = await Promise.all(newCollaborators.map(
        (c) => userSettingOverridesById(
          c.userId,
          USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
        ),
      ));

      const newCollaboratorsWithSettings = newCollaborators.filter((_value, index) => {
        if (!settingsForAllCollabs[index]) {
          return false;
        }
        return settingsForAllCollabs[index].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
      });

      collaboratorAssignedNotification(savedReport, newCollaboratorsWithSettings);
    }

    res.json(savedReport);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * create an activity report
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function createReport(req, res) {
  try {
    const newReport = req.body;
    if (!newReport) {
      res.sendStatus(400);
      return;
    }
    const userId = await currentUserId(req, res);
    newReport.submissionStatus = REPORT_STATUSES.DRAFT;
    newReport.userId = userId;
    newReport.lastUpdatedById = userId;
    const user = await userById(userId);
    const authorization = new ActivityReport(user, newReport);
    if (!authorization.canCreate()) {
      res.sendStatus(403);
      return;
    }
    // updateCollaboratorRoles(newReport);
    const report = await createOrUpdate(newReport);
    if (report.activityReportCollaborators) {
      const collabs = report.activityReportCollaborators;

      const settingsForAllCollabs = await Promise.all(collabs.map(
        (c) => userSettingOverridesById(
          c.userId,
          USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
        ),
      ));

      const collabsWithSettings = collabs.filter((_value, index) => {
        if (!settingsForAllCollabs[index]) {
          return false;
        }
        return settingsForAllCollabs[index].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
      });
      collaboratorAssignedNotification(report, collabsWithSettings);
    }
    res.json(report);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Download activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function downloadReports(req, res) {
  try {
    const userId = await currentUserId(req, res);
    const readRegions = await getUserReadRegions(userId);

    const reports = await getDownloadableActivityReportsByIds(
      readRegions,
      req.query,
    );

    const { format = 'json' } = req.query || {};

    if (!reports) {
      res.sendStatus(404);
    } else if (format === 'csv') {
      await sendActivityReportCSV(reports, res);
    } else {
      res.json(reports);
    }
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function downloadAllReports(req, res) {
  try {
    const userId = await currentUserId(req, res);
    const readRegions = await setReadRegions(req.query, userId);

    const ids = req.query.id || [];

    const reports = await getAllDownloadableActivityReports(
      readRegions['region.in'],
      { ...readRegions, limit: null },
      userId,
      ids,
    );

    await sendActivityReportCSV(reports, res);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function downloadAllAlerts(req, res) {
  try {
    const userId = await currentUserId(req, res);
    const query = await setReadRegions(req.query, userId);
    const rows = await getAllDownloadableActivityReportAlerts(userId, query);

    await sendActivityReportCSV(rows, res);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function setGoalAsActivelyEdited(req, res) {
  try {
    const { activityReportId } = req.params;
    const { goalIds } = req.query;
    const { pageState } = req.body;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    const goals = await setActivityReportGoalAsActivelyEdited(goalIds, activityReportId, pageState);
    res.json(goals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
