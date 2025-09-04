import _ from 'lodash';
import { Op } from 'sequelize';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import filtersToScopes from '../scopes';
import { syncCRApprovers } from './collabReportApprovers';

const {
  CollabReport,
  CollabReportApprover,
  CollabReportSpecialist,
  User,
} = db;

const REPORTS_PER_PAGE = 10;

// Helper function to create a report
async function create(report) {
  return CollabReport.create(report);
}

// Function to save and remove CR specialists
async function saveReportSpecialists(collabReportId, specialists) {
  // Make a handy lookup object for the findOrCreate that comes next
  const newSpecialists = specialists.map((c) => ({
    collabReportId,
    userId: c,
  }));

  // Create and/or delete CR specialists
  if (newSpecialists.length > 0) {
    await Promise.all(newSpecialists.map((where) => (
      CollabReportSpecialist.findOrCreate({ where })
    )));
    await CollabReportSpecialist.destroy(
      {
        where: {
          collabReportId,
          userId: {
            [Op.notIn]: specialists,
          },
        },
      },
    );
  } else {
    await CollabReportSpecialist.destroy({
      where: {
        collabReportId,
      },
    });
  }
}

// Helper function to update a report using the model's built-in update
async function update(newReport, oldReport) {
  const updatedReport = await oldReport.update(newReport, {
    fields: _.keys(newReport),
  });
  return updatedReport;
}

// Get a CR by its id
export async function collabReportById(crId) {
  const collabReportId = parseInt(crId, DECIMAL_BASE);

  const report = await CollabReport.findOne({
    where: {
      id: crId,
    },
    include: [
      {
        model: User,
        as: 'author',
      },
      {
        required: false,
        model: CollabReportSpecialist,
        separate: true,
        as: 'collabReportSpecialists',
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
      },
      {
        model: CollabReportApprover,
        attributes: ['id', 'status', 'note'],
        as: 'approvers',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
          },
        ],
      },
    ],
  });

  return report;
}

// Service to handle creating and updating CRs
export async function createOrUpdateReport(newReport, oldReport) {
  let savedReport;

  // Determine whether to update or create
  if (oldReport) {
    savedReport = await update(newReport, oldReport);
  } else {
    savedReport = await create(newReport);
  }

  // If there are specialists, those need to be saved separately
  if (newReport.collabReportSpecialists) {
    const { id: reportId } = savedReport;
    const specialists = newReport.collabReportSpecialists.map(
      (c) => c.user.id,
    );
    await saveReportSpecialists(reportId, specialists);
  }

  // Sync the approvers, if an empty array they get removed
  if (newReport.approverUserIds) {
    await syncCRApprovers(savedReport.id, newReport.approverUserIds);
  }

  // Finally, fetch a new copy of the saved report from the DB
  // (to ensure everything saved correctly, I guess?)
  const report = await collabReportById(savedReport.id);

  return {
    ...report.dataValues,
  };
}

export async function getReports(
  {
    sortBy = 'updatedAt',
    sortDir = 'desc',
    offset = 0,
    limit = REPORTS_PER_PAGE,
    status = REPORT_STATUSES.APPROVED,
    userId = 0,
    ...filters
  }: {
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
    status?: keyof typeof REPORT_STATUSES | Array<keyof typeof REPORT_STATUSES>;
    userId?: number;
  } = {},
) {
  const { collabReports: scopes } = await filtersToScopes(filters, { userId });

  return CollabReport.findAndCountAll({
    where: {
      [Op.and]: [
        { status },
        scopes,
      ],
    },
    include: [
      {
        model: User,
        as: 'author',
        required: false,
      },
      {
        model: CollabReportSpecialist,
        as: 'collabReportSpecialists',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
      },
      {
        model: CollabReportApprover,
        attributes: ['id', 'status', 'note'],
        as: 'approvers',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
          },
        ],
      },
    ],
    order: [[sortBy, sortDir]],
  });
}

export async function submitReport(reportId: number) {
  const report = await CollabReport.findByPk(reportId);

  await report.save({
    status: REPORT_STATUSES.SUBMITTED,
  }); // this fires a pre-submit hook that verifies that
  // the report is complete and can be submitted and throws an
  // error otherwise

  await report.reload();
  return report;
}
