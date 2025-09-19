import _ from 'lodash';
import { Model, Op } from 'sequelize';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import db, { sequelize } from '../models';
import filtersToScopes from '../scopes';
import { syncCRApprovers } from './collabReportApprovers';

interface ICollabReport {
  id: number;
  collabReportSpecialists: {
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
  CollabReportStep,
  CollabReportReason,
  CollabReportDataUsed,
  CollabReportGoal,
  CollabReportActivityState,
  User,
  Role,
  GoalTemplate,
} = db;

const REPORTS_PER_PAGE = 10;

export const orderCollabReportsBy = (sortBy: string, sortDir: 'desc' | 'asc') => {
  const SORT_KEY = {
    Activity_name: 'name',
    Report_ID: 'id',
    Date_started: 'startDate',
    Created_date: 'createdAt',
    Last_saved: 'updatedAt',
    Creator: sequelize.literal('"_1"'),
    Collaborators: sequelize.literal('(SELECT MIN("Users"."name") FROM "CollabReportSpecialists" INNER JOIN "Users" ON "Users"."id" = "CollabReportSpecialists"."specialistId" WHERE "CollabReportSpecialists"."collabReportId" = "CollabReport"."id" AND "CollabReportSpecialists"."deletedAt" IS NULL)'),
    Status: 'calculatedStatus',
    Approvers: sequelize.literal('(SELECT MIN("Users"."name") FROM "CollabReportApprovers" INNER JOIN "Users" ON "Users"."id" = "CollabReportApprovers"."userId" WHERE "CollabReportApprovers"."collabReportId" = "CollabReport"."id" AND "CollabReportApprovers"."deletedAt" IS NULL)'),
  };

  return [[SORT_KEY[sortBy] || 'updatedAt', sortDir]];
};

export const collabReportScopes = async (filters, userId, status) => {
  const { collabReport: customScopes } = await filtersToScopes(filters);
  const standardScopes = {
    calculatedStatus: status,
  };

  if (userId) {
    standardScopes[Op.or] = [
      {
        userId,
      },
      {
        id: {
          [Op.in]: sequelize.literal(`(SELECT crs."collabReportId" FROM "CollabReportSpecialists" crs WHERE crs."specialistId" = ${userId})`),
        },
      },
      {
        id: {
          [Op.in]: sequelize.literal(`(SELECT cra."collabReportId" FROM "CollabReportApprovers" cra WHERE cra."userId" = ${userId})`),
        },
      },
    ];
  }

  return {
    customScopes,
    standardScopes,
  };
};

// Helper function to create a report
async function create(report) {
  return CollabReport.create(report);
}

async function saveReportReasons(collabReportId, reasons) {
  // Make a handy lookup object for the findOrCreate that comes next
  const newReasons = reasons.map((r) => ({
    collabReportId,
    reasonId: r,
  }));

  if (newReasons.length > 0) {
    await Promise.all(newReasons.map((where) => (
      CollabReportReason.findOrCreate({ where })
    )));
    await CollabReportReason.destroy(
      {
        where: {
          collabReportId,
          reasonId: {
            [Op.notIn]: reasons,
          },
        },
      },
    );
  } else {
    // If no reasons, destroy any existing reason objects in the DB
    await CollabReportReason.destroy({
      where: {
        collabReportId,
      },
    });
  }
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
        required: false,
        model: CollabReportReason,
        as: 'reportReasons',
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
        model: CollabReportGoal,
        as: 'reportGoals',
        include: [
          {
            model: GoalTemplate,
            as: 'goalTemplate',
            attributes: ['id', 'standard'],
          },
        ],
      },
      {
        model: CollabReportDataUsed,
        as: 'dataUsed',
      },
      {
        model: CollabReportStep,
        as: 'steps',
        required: false,
        attributes: [
          'collabStepCompleteDate',
          'collabStepDetail',
        ],
      },
      {
        model: CollabReportReason,
        as: 'reportReasons',
      },
      {
        model: CollabReportActivityState,
        as: 'activityStates',
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

  const {
    author,
    collabReportSpecialists,
    approvers,
    reportReasons,
    ...fields
  } = newReport;

  // Determine whether to update or create
  if (oldReport) {
    savedReport = await update(fields, oldReport);
  } else {
    savedReport = await create(newReport);
  }

  // Save any CollabReportReasons
  if (reportReasons) {
    const { id: reportId } = savedReport;
    await saveReportReasons(reportId, reportReasons);
  }

  // If there are specialists, those need to be saved separately
  if (collabReportSpecialists) {
    const { id: reportId } = savedReport;
    const specialists = collabReportSpecialists.map(
      (c) => c.value,
    );
    await saveReportSpecialists(reportId, specialists);
  }

  // Sync the approvers, if an empty array they get removed
  if (approvers) {
    await syncCRApprovers(savedReport.id, approvers.map(({ userId }) => userId));
  }

  // Finally, fetch a new copy of the saved report from the DB
  // (to ensure everything saved correctly, I guess?)
  const report = await collabReportById(savedReport.id);

  // using toJSON rather than datavalues, as it captures sequelize magic like virtual fields
  // much more effectively
  return report.toJSON();
}

export async function getCSVReports(
  {
    sortBy = 'updatedAt',
    sortDir = 'desc',
    offset = '0',
    limit = String(REPORTS_PER_PAGE),
    status = REPORT_STATUSES.APPROVED,
    userId,
    ...filters
  }: {
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    offset?: string;
    limit?: string;
    userId?: number;
    status?: keyof typeof REPORT_STATUSES | Array<keyof typeof REPORT_STATUSES>;
  } = {},
) {
  const order = orderCollabReportsBy(sortBy, sortDir);
  const {
    standardScopes,
    customScopes,
  } = await collabReportScopes(filters, userId, status);

  return CollabReport.findAll({
    attributes: {
      include: [
        ['calculatedStatus', 'status'],
      ],
      exclude: [
        'calculatedStatus',
        'submissionStatus',
        'lastUpdatedById',
      ],
    },
    where: {
      [Op.and]: [
        standardScopes,
        customScopes,
      ],
    },
    include: [

      {
        model: User,
        as: 'author',
        required: true,
        attributes: ['fullName', 'name'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
          },
        ],
      },
      {
        model: User,
        as: 'collaboratingSpecialists',
        attributes: ['id', 'name', 'fullName'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
          },
        ],
      },
      {
        model: CollabReportApprover,
        attributes: [
          'id',
          'status',
          'note',
        ],
        as: 'approvers',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['name'],
              },
            ],
          },
        ],
      },
      {
        model: CollabReportStep,
        as: 'steps',
        required: false,
        attributes: [
          'collabStepCompleteDate',
          'collabStepDetail',
        ],
      },
      {
        model: CollabReportReason,
        as: 'reportReasons',
      },
    ],
    limit: limit === 'all' ? null : Number(limit),
    order,
  });
}

export async function getReports(
  {
    sortBy = 'updatedAt',
    sortDir = 'desc',
    offset = '0',
    limit = String(REPORTS_PER_PAGE),
    status = REPORT_STATUSES.APPROVED,
    userId,
    ...filters
  }: {
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    offset?: string;
    limit?: string;
    userId?: number;
    status?: keyof typeof REPORT_STATUSES | Array<keyof typeof REPORT_STATUSES>;
  } = {},
) {
  const order = orderCollabReportsBy(sortBy, sortDir);
  const {
    standardScopes,
    customScopes,
  } = await collabReportScopes(filters, userId, status);

  return CollabReport.findAndCountAll({
    attributes: [
      'id',
      'name',
      'startDate',
      'createdAt',
      'updatedAt',
      'displayId',
      'regionId',
      'link',
      'calculatedStatus',
      'submissionStatus',
    ],
    where: {
      [Op.and]: [
        standardScopes,
        customScopes,
      ],
    },
    include: [
      {
        model: User,
        as: 'author',
        required: true,
        attributes: ['fullName', 'name'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
          },
        ],
      },
      {
        model: User,
        as: 'collaboratingSpecialists',
        attributes: ['id', 'name', 'fullName'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['name'],
          },
        ],
      },
      {
        model: CollabReportApprover,
        attributes: [
          'id',
          'status',
          'note',
        ],
        as: 'approvers',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['name'],
              },
            ],
          },
        ],
      },
    ],
    limit: limit === 'all' ? null : Number(limit),
    order,
  });
}

export async function deleteReport(report: Model) {
  // there's no need to remove related models at this time
  // since populating deletedAt should a) remove all trace of
  // a collaboration report from the UI and b) preserve the state
  // of the report at deletion, should we need to restore it
  return report.destroy();
}
