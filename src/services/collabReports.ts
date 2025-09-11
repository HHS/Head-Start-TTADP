import _ from 'lodash';
import { Model, Op } from 'sequelize';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import filtersToScopes from '../scopes';
import { syncCRApprovers } from './collabReportApprovers';

interface ICollabReport {
  id: number;
  collabReportCollaborators: {
    userId: number;
    user: {
      id: number;
      email: string;
    }
  }[];
}

const {
  CollabReport,
  CollabReportApprover,
  CollabReportSpecialist,
  User,
  Region,
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
    specialistId: c,
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
          specialistId: {
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
export async function collabReportById(crId: string) {
  const collabReportId = parseInt(crId, DECIMAL_BASE);

  const report = await CollabReport.findOne({
    where: {
      id: collabReportId,
    },
    include: [
      {
        model: User,
        as: 'author',
      },
      {
        model: Region,
        as: 'region',
      },
      {
        required: false,
        model: CollabReportSpecialist,
        separate: true,
        as: 'collabReportSpecialists',
        include: [
          {
            model: User,
            as: 'specialist',
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
// todo: create proper typescript interface for the collab report
export async function createOrUpdateReport(newReport, oldReport): Promise<ICollabReport> {
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
      (c) => c.value,
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

  // using toJSON rather than datavalues, as it captures sequelize magic like virtual fields
  // much more effectively
  return report.toJSON();
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
    attributes: ['id'],
    where: {
      [Op.and]: [
        { calculatedStatus: status },
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
        model: Region,
        as: 'region',
      },
      {
        model: CollabReportSpecialist,
        as: 'collabReportSpecialists',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'specialist',
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

export async function deleteReport(report: Model) {
  // there's no need to remove related models at this time
  // since populating deletedAt should a) remove all trace of
  // a collaboration report from the UI and b) preserve the state
  // of the report at deletion, should we need to restore it
  return report.destroy();
}
