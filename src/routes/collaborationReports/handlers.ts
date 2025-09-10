import type { Request, Response } from 'express';
import { REPORT_STATUSES } from '@ttahub/common';
import CollabReportPolicy from '../../policies/collabReport';
import {
  collabReportById,
  createOrUpdateReport,
  getReports as getReportsService,
} from '../../services/collabReports';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import ActivityReport from '../../policies/activityReport';
import handleErrors from '../../lib/apiErrorHandler';
import { userSettingOverridesById } from '../../services/userSettings';
import { USER_SETTINGS } from '../../constants';
import {
  collaboratorAssignedNotification,
  // changesRequestedNotification,
  // reportApprovedNotification,
} from '../../lib/mailer';
import { setReadRegions } from '../../services/accessValidation';
import { upsertApprover } from '../../services/collabReportApprovers';

const namespace = 'SERVICE:COLLAB_REPORTS';

const logContext = {
  namespace,
};

export async function getReport(req: Request, res: Response) {
  const { collabReportId } = req.params;
  const report = await collabReportById(collabReportId);

  if (!report) {
    res.sendStatus(404);
    return;
  }

  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new CollabReportPolicy(user, report);

  if (!authorization.canGet()) {
    res.sendStatus(403);
    return;
  }

  // abandoned use of ...dataValues
  // using toJSON preserves virtual fields
  res.json(report.toJSON());
}

export async function getReports(req: Request, res: Response) {
  try {
    // get the current user ID from the request
    const userId = await currentUserId(req, res);
    // filter the query so that only regions the user has permission
    // to are included
    const query = await setReadRegions(req.query, userId);
    // the query here may contain additional filter information
    // so we expect the collab reports to have a full filter suite
    const reportPayload = await getReportsService(query);
    // reportPayload will be an object like:
    // - { count: number, rows: CollabReport[] }
    // if no reports are found, it'll just be:
    // - { count: 0, rows: [] }
    // so there's no reason to 404 or die here
    res.json(reportPayload);
  } catch (err) {
    await handleErrors(req, res, err, logContext);
  }
}

export async function saveReport(req: Request, res: Response) {
  try {
    // Make sure there's a new report to save
    const newReport = req.body;
    if (!newReport) {
      res.sendStatus(400);
      return;
    }

    // Make sure there's an old report to update
    const userId = await currentUserId(req, res);
    const { collabReportId } = req.params;
    const existingReport = await collabReportById(collabReportId);
    if (!existingReport) {
      res.sendStatus(404);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new ActivityReport(user, existingReport);
    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    // Record who's making the change
    newReport.lastUpdatedById = userId;

    // Don't allow regionId to be changed after creation
    delete newReport.regionId;

    // Merge the updated report with the old
    const savedReport = await createOrUpdateReport({
      ...existingReport, ...newReport,
    }, existingReport);

    // Determine if notifications need to be sent out to collaborators
    if (savedReport.collabReportCollaborators) {
      // Only include new collaborators
      const oldCollaborators = existingReport.collabReportCollaborators.map((o) => o.user.email);
      // eslint-disable-next-line max-len
      const newCollaborators = savedReport.collabReportCollaborators.filter((c) => !oldCollaborators.includes(c.user.email));

      // Get all of the user setting overrides for each new collaborator,
      // will filter them in the next step
      const settingsForAllCollabs = await Promise.all(
        newCollaborators.map((c) => userSettingOverridesById(
          c.userId,
          USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
        )),
      );

      // Filter so that we get just collabs who want a notification
      const newCollaboratorsToNotify = newCollaborators.filter((_value, index) => {
        // Check to make sure there's a setting for this collaborator
        if (!settingsForAllCollabs[index]) {
          return false;
        }

        // Return whether or not to email this collaborator
        return settingsForAllCollabs[index].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
      });

      // Finally, notify the appropriate collaborators
      collaboratorAssignedNotification(savedReport, newCollaboratorsToNotify);
    }
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function softDeleteReport(req: Request, res: Response) {
  res.send(204);
}

export async function submitReport(req: Request, res: Response) {
  try {
    // Chek report existence
    const userId = await currentUserId(req, res);
    const { collabReportId } = req.params;
    const existingReport = await collabReportById(collabReportId);
    if (!existingReport) {
      res.sendStatus(404);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, existingReport);
    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    const newReport = {
      lastUpdatedById: userId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
    };

    // Merge the updated report with the old
    const savedReport = await createOrUpdateReport(
      {
        ...existingReport,
        ...newReport,
      },
      existingReport,
    );

    res.json(savedReport);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Review a report, setting Approver status to approved or needs action
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function reviewReport(req: Request, res: Response) {
  try {
    const { collabReportId } = req.params;
    const { status, note } = req.body;
    const userId = await currentUserId(req, res);

    const existingReport = await collabReportById(collabReportId);
    if (!existingReport) {
      res.sendStatus(404);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, existingReport);
    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    const savedApprover = await upsertApprover({
      status,
      note,
      collabReportId,
      userId,
    });

    // TODO: send notifications in a future ticket

    res.json(savedApprover);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createReport(req: Request, res: Response) {
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
    const authorization = new CollabReportPolicy(user, newReport);
    if (!authorization.canCreate()) {
      res.sendStatus(403);
      return;
    }
    const report = await createOrUpdateReport(newReport, null);
    if (report.collabReportCollaborators) {
      const collabs = report.collabReportCollaborators;

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
