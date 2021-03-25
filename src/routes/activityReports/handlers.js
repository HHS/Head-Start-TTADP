import stringify from 'csv-stringify/lib/sync';
import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import ActivityReport from '../../policies/activityReport';
import User from '../../policies/user';
import {
  possibleRecipients,
  activityReportById,
  createOrUpdate,
  review,
  activityReports,
  setStatus,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReports,
} from '../../services/activityReports';
import { goalsForGrants } from '../../services/goals';
import { userById, usersWithPermissions } from '../../services/users';
import { REPORT_STATUSES, DECIMAL_BASE } from '../../constants';
import { getUserReadRegions } from '../../services/accessValidation';
import { activityReportToCsvRecord } from '../../lib/transform';

const { APPROVE_REPORTS } = SCOPES;

const namespace = 'SERVICE:ACTIVITY_REPORTS';

const logContext = {
  namespace,
};

export async function getLegacyReport(req, res) {
  try {
    const { legacyReportId } = req.params;
    const report = await activityReportByLegacyId(legacyReportId);
    if (!report) {
      res.sendStatus(404);
      return;
    }
    const user = await userById(req.session.userId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canViewLegacy()) {
      res.sendStatus(403);
      return;
    }
    res.json(report);
  } catch (error) {
    handleErrors(req, res, error, logContext);
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

export async function resetToDraft(req, res) {
  try {
    const { activityReportId } = req.params;

    const user = await userById(req.session.userId);
    const report = await activityReportById(activityReportId);
    const authorization = new ActivityReport(user, report);

    if (!authorization.canReset()) {
      res.sendStatus(403);
      return;
    }

    const savedReport = await setStatus(report, REPORT_STATUSES.DRAFT);
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
  const { region } = req.query;
  const targetRegion = region ? parseInt(region, DECIMAL_BASE) : undefined;
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
  const readRegions = await getUserReadRegions(req.session.userId);
  const reportsWithCount = await activityReports(readRegions, req.query);
  if (!reportsWithCount) {
    res.sendStatus(404);
  } else {
    res.json(reportsWithCount);
  }
}

/**
 * Retrieve activity report alerts
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getReportAlerts(req, res) {
  const { userId } = req.session;
  const alertsWithCount = await activityReportAlerts(userId, req.query);

  if (!alertsWithCount) {
    res.sendStatus(404);
  } else {
    res.json({ alertsCount: alertsWithCount.count, alerts: alertsWithCount.rows });
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

/**
 * Download activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function downloadReports(req, res) {
  try {
    const readRegions = await getUserReadRegions(req.session.userId);
    const reportsWithCount = await getDownloadableActivityReports(readRegions, req.query);
    const { format = 'json' } = req.query || {};

    if (!reportsWithCount) {
      res.sendStatus(404);
    } else if (format === 'csv') {
      const { rows } = reportsWithCount;
      const csvRows = await Promise.all(rows.map((r) => activityReportToCsvRecord(r)));
      const csvData = stringify(
        csvRows,
        {
          header: true,
          quoted: true,
          quoted_empty: true,
        },
      );
      res.attachment('activity-reports.csv');
      res.send(csvData);
    } else {
      res.json(reportsWithCount);
    }
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
