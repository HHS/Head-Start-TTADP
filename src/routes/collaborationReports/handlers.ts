import type { Request, Response } from 'express';
import stringify from 'csv-stringify/lib/sync';
import { REPORT_STATUSES, APPROVER_STATUSES } from '@ttahub/common';
import {
  NOT_FOUND,
  FORBIDDEN,
  BAD_REQUEST,
  NO_CONTENT,
} from 'http-codes';
import CollabReportPolicy from '../../policies/collabReport';
import {
  collabReportById,
  createOrUpdateReport,
  getReports as getReportsService,
  deleteReport,
  getCSVReports,
} from '../../services/collabReports';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';
import { userSettingOverridesById } from '../../services/userSettings';
import { USER_SETTINGS } from '../../constants';
import {
  collaboratorAssignedNotification,
} from '../../lib/mailer';
import { setReadRegions } from '../../services/accessValidation';
import { upsertApprover } from '../../services/collabReportApprovers';
import { collabReportToCsvRecord } from '../../lib/transform';
import db from '../../models';

const { CollabReportApprover } = db;

const namespace = 'SERVICE:COLLAB_REPORTS';

const logContext = {
  namespace,
};

export async function getReport(req: Request, res: Response) {
  const { collabReportId } = req.params;
  const report = await collabReportById(collabReportId);

  if (!report) {
    res.sendStatus(NOT_FOUND);
    return;
  }

  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const authorization = new CollabReportPolicy(user, report);

  if (!authorization.canGet()) {
    res.sendStatus(FORBIDDEN);
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

export async function getAlerts(req: Request, res: Response) {
  try {
    // get the current user ID from the request
    const userId = await currentUserId(req, res);
    // filter the query so that only regions the user has permission
    // to are included
    const query = await setReadRegions(req.query, userId);
    // the query here may contain additional filter information
    // so we expect the collab reports to have a full filter suite

    const reportPayload = await getReportsService({
      ...query,
      limit: 'all',
      status: [
        REPORT_STATUSES.DRAFT,
        REPORT_STATUSES.SUBMITTED,
        REPORT_STATUSES.NEEDS_ACTION,
      ],
      userId,
    });
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

export async function sendCollabReportCSV(reports, res) {
  const csvRows = await Promise.all(reports.map((r) => collabReportToCsvRecord(r)));

  // base options
  let options = {
    header: true,
    quoted: true,
    quoted_empty: true,
    columns: [],
  };

  if (csvRows.length > 0) {
    options = {
      ...options,
      columns: [
        {
          key: 'displayId',
          header: 'Report ID',
        },
        {
          key: 'name',
          header: 'Activity name',
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
          key: 'duration',
          header: 'Duration',
        },
        {
          key: 'purpose',
          header: 'Purpose',
        },
        {
          key: 'isStateActivity',
          header: 'Is state activity',
        },
        {
          key: 'method',
          header: 'Method',
        },
        {
          key: 'description',
          header: 'Description',
        },
        {
          key: 'steps',
          header: 'Next steps',
        },
        {
          key: 'createdAt',
          header: 'Created date',
        },
        {
          key: 'updatedAt',
          header: 'Last updated date',
        },
      ],
    };
  }

  const csvData = stringify(
    csvRows,
    options,
  );

  res.send(csvData);
}

/**
 * Download activity reports
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function downloadReports(req: Request, res: Response) {
  try {
    // get the current user ID from the request
    const userId = await currentUserId(req, res);
    // filter the query so that only regions the user has permission
    // to are included
    const query = await setReadRegions(req.query, userId);
    // the query here may contain additional filter information
    // so we expect the collab reports to have a full filter suite
    const reportPayload = await getCSVReports(query);
    await sendCollabReportCSV(reportPayload, res);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function saveReport(req: Request, res: Response) {
  try {
    // Make sure there's a new report to save
    const newReport = req.body;
    if (!newReport) {
      res.sendStatus(BAD_REQUEST);
      return;
    }

    // Make sure there's an old report to update
    const userId = await currentUserId(req, res);
    const { collabReportId } = req.params;
    const existingReport = await collabReportById(collabReportId);
    if (!existingReport) {
      res.sendStatus(NOT_FOUND);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, existingReport);
    if (!authorization.canUpdate()) {
      res.sendStatus(FORBIDDEN);
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

    res.json(savedReport);
    return;
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
export async function softDeleteReport(req: Request, res: Response) {
  try {
    const { collabReportId } = req.params;

    const report = await collabReportById(collabReportId);

    if (!report) {
      res.sendStatus(NOT_FOUND);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, report);

    if (!authorization.canDelete()) {
      res.sendStatus(FORBIDDEN);
      return;
    }

    await deleteReport(report);
    res.sendStatus(NO_CONTENT);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function submitReport(req: Request, res: Response) {
  try {
    // Check report existence
    const userId = await currentUserId(req, res);
    const { collabReportId } = req.params;
    const existingReport = await collabReportById(collabReportId);
    if (!existingReport) {
      res.sendStatus(NOT_FOUND);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, existingReport);
    if (!authorization.canUpdate()) {
      res.sendStatus(FORBIDDEN);
      return;
    }

    const newReport = {
      lastUpdatedById: userId,
      submittedAt: new Date(),
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      approvers: req.body.approvers,
    };

    // Merge the updated report with the old
    const savedReport = await createOrUpdateReport(
      {
        ...existingReport,
        ...newReport,
      },
      existingReport,
    );

    // Resubmitting resets any needs_action status to null ("pending" status)
    await CollabReportApprover.update({ status: null }, {
      where: { status: APPROVER_STATUSES.NEEDS_ACTION, collabReportId },
      individualHooks: true,
    });

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
      res.sendStatus(NOT_FOUND);
      return;
    }

    // Make sure the current user is authorized to update the report
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, existingReport);
    if (!authorization.canReview()) {
      res.sendStatus(FORBIDDEN);
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
      res.sendStatus(BAD_REQUEST);
      return;
    }
    const userId = await currentUserId(req, res);
    newReport.submissionStatus = REPORT_STATUSES.DRAFT;
    newReport.userId = userId;
    newReport.lastUpdatedById = userId;
    const user = await userById(userId);
    const authorization = new CollabReportPolicy(user, newReport);
    if (!authorization.canCreate()) {
      res.sendStatus(FORBIDDEN);
      return;
    }
    const report = await createOrUpdateReport(newReport, null);
    if (report.collabReportSpecialists) {
      const collabs = report.collabReportSpecialists;

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
