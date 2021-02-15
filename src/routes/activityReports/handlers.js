import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import ActivityReport from '../../policies/activityReport';
import User from '../../policies/user';
import {
  possibleRecipients, activityReportById, createOrUpdate, review, activityReports,
} from '../../services/activityReports';
import { goalsForGrants } from '../../services/goals';
import { userById, usersWithPermissions } from '../../services/users';
import { REPORT_STATUSES, DECIMAL_BASE } from '../../constants';

const { APPROVE_REPORTS } = SCOPES;

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
  const { region } = req.query;
  const user = await userById(req.session.userId);
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
 * Review a report setting it's status to approved or needs action
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function reviewReport(req, res) {
  try {
    const { activityReportId } = req.params;
    const { status, managerNotes } = req.body;

    const user = await userById(req.session.userId);
    const report = await activityReportById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canReview()) {
      res.sendStatus(403);
      return;
    }

    const savedReport = await review(report, status, managerNotes);
    res.json(savedReport);
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
    newReport.status = REPORT_STATUSES.SUBMITTED;

    const user = await userById(req.session.userId);
    const report = await activityReportById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    const savedReport = await createOrUpdate(newReport, report);
    res.json(savedReport);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getActivityRecipients(req, res) {
  const activityRecipients = await possibleRecipients();
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
  const report = await activityReportById(activityReportId);
  if (!report) {
    res.sendStatus(404);
    return;
  }
  const user = await userById(req.session.userId);
  const authorization = new ActivityReport(user, report);

  if (!authorization.canGet()) {
    res.sendStatus(403);
    return;
  }

  res.json(report);
}

/**
 * Retrieve activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReports(req, res) {
  const reports = await activityReports();
  if (!reports) {
    res.sendStatus(404);
  } else {
    res.json(reports);
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
    const report = await activityReportById(activityReportId);
    if (!report) {
      res.sendStatus(404);
      return;
    }

    const user = await userById(req.session.userId);
    const authorization = new ActivityReport(user, report);
    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    newReport.lastUpdatedById = userId;

    const savedReport = await createOrUpdate(newReport, report);
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
    const userId = parseInt(req.session.userId, 10);
    newReport.status = REPORT_STATUSES.DRAFT;
    newReport.userId = userId;
    newReport.lastUpdatedById = userId;
    const user = await userById(req.session.userId);
    const authorization = new ActivityReport(user, newReport);
    if (!authorization.canCreate()) {
      res.sendStatus(403);
      return;
    }

    const report = await createOrUpdate(newReport);
    res.json(report);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
