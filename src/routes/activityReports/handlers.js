import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import {
  activityRecipients, activityReportById, createOrUpdate, reportExists,
} from '../../services/activityReports';
import { goalsForGrants } from '../../services/goals';
import { userById, usersWithPermissions } from '../../services/users';

const { READ_WRITE_REPORTS, APPROVE_REPORTS } = SCOPES;

const namespace = 'SERVICE:ACTIVITY_REPORTS';

const logContext = {
  namespace,
};

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
 * Gets all users that have approve permissions for the current user's
 * regions.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getApprovers(req, res) {
  const user = await userById(req.session.userId);
  const reportRegions = user.permissions
    .filter((p) => p.scopeId === READ_WRITE_REPORTS)
    .map((p) => p.regionId);
  try {
    const users = await usersWithPermissions(reportRegions, [APPROVE_REPORTS]);
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Flags a report as submitted for approval
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function submitReport(req, res) {
  try {
    const { activityReportId } = req.params;
    const { approvingManagerId, additionalNotes } = req.body;
    const newReport = { approvingManagerId, additionalNotes };
    newReport.status = 'submitted';
    const report = await createOrUpdate(newReport, activityReportId);
    res.json(report);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getActivityRecipients(req, res) {
  const recipients = await activityRecipients();
  res.json(recipients);
}

/**
 * Retrieve an activity report
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReport(req, res) {
  const { activityReportId } = req.params;
  const report = await activityReportById(activityReportId);
  if (!report) {
    res.sendStatus(404);
  } else {
    res.json(report);
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
    const userId = parseInt(req.session.userId, 10);
    const { activityReportId } = req.params;

    if (!await reportExists(activityReportId)) {
      res.sendStatus(404);
      return;
    }

    newReport.userId = userId;
    newReport.lastUpdatedById = userId;

    const report = await createOrUpdate(newReport, activityReportId);
    res.json(report);
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
    const userId = parseInt(req.session.userId, 10);
    newReport.status = 'draft';
    newReport.userId = userId;
    newReport.lastUpdatedById = userId;

    const report = await createOrUpdate(newReport);
    res.json(report);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
