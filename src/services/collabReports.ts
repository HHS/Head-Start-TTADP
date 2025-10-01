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

async function saveCollabReportAssociation(
  collabReportId: number,
  model: typeof CollabReportActivityState | typeof CollabReportActivityState,
  associationKey: 'reasonId' | 'activityStateCode',
  data: { id: number | string }[],
) {
  if (data.length) {
  // Make a handy lookup object for the findOrCreate that comes next
    const lookup = data.map((d) => ({
      collabReportId,
      [associationKey]: d.id,
    }));

    const lookupIds = lookup.map((l) => l[associationKey]);

    const existing = await model.findAll({
      attributes: [
        'collabReportId',
        associationKey,
      ],
      where: {
        collabReportId,
        [associationKey]: lookupIds,
      },
    });

    const existingLookup = existing.map((l) => l[associationKey]);

    const toCreate = [] as { collabReportId: number, [associationKey]: string | number }[];
    lookup.forEach((l) => {
      if (!existingLookup.includes(l[associationKey])) {
        toCreate.push({
          collabReportId,
          [associationKey]: l[associationKey],
        });
      }
    });

    await model.bulkCreate(toCreate);
    await model.destroy({
      where: {
        collabReportId,
        [associationKey]: {
          [Op.notIn]: lookupIds,
        },
      },
    });
  } else {
    // If no reasons, destroy any existing reason objects in the DB
    await model.destroy({
      where: {
        collabReportId,
      },
    });
  }
}

async function saveReportReasons(collabReportId: number, reasons: string[]) {
  await saveCollabReportAssociation(
    collabReportId,
    CollabReportReason,
    'reasonId',
    reasons.map((reasonId) => ({ id: reasonId })),
  );
}

async function saveReportSteps(collabReportId: number, steps: Model[]) {
  // First, destroy all existing steps for this report
  await CollabReportStep.destroy({
    where: {
      collabReportId,
    },
  });

  // Then create new steps if any are provided
  if (steps && steps.length > 0) {
    const newSteps = steps.map((step: Model) => ({
      collabReportId,
      ...step.toJSON(),
    }));
    await CollabReportStep.bulkCreate(newSteps);
  }
}

async function saveReportGoals(collabReportId: number, reportGoals: number[]) {
  // First, destroy any existing goals for this report
  await CollabReportGoal.destroy({
    where: {
      collabReportId,
    },
  });

  // Then create new goals if any are provided
  if (reportGoals && reportGoals.length > 0) {
    const newGoals = reportGoals.map((goal: number) => ({
      collabReportId,
      goalTemplateId: goal,
    }));
    await CollabReportGoal.bulkCreate(newGoals);
  }
}

async function saveReportDataUsed(collabReportId, dataUsed) {
  // First, destroy all existing data used entries for this report
  await CollabReportDataUsed.destroy({
    where: {
      collabReportId,
    },
  });

  // Then create new data used entries if any are provided
  if (dataUsed && dataUsed.length > 0) {
    const newDataUsed = dataUsed.map((data) => ({
      collabReportId,
      collabReportDatum: data.collabReportDatum || data,
    }));
    await CollabReportDataUsed.bulkCreate(newDataUsed);
  }
}

async function saveReportActivityStates(collabReportId: number, activityStates: string[]) {
  await saveCollabReportAssociation(
    collabReportId,
    CollabReportActivityState,
    'activityStateCode',
    activityStates.map((state) => ({ id: state })),
  );
}

// Function to save and remove CR specialists
async function saveReportSpecialists(collabReportId: number, specialists: number[]) {
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
  const fields = newReport;

  const updatedReport = await oldReport.update(fields, {
    fields: _.keys(fields),
  });
  return updatedReport;
}

// Get a CR by its id
export async function collabReportById(crId: string) {
  const collabReportId = parseInt(crId, DECIMAL_BASE);

  const report = await CollabReport.findOne({
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT array_agg("reasonId")
            FROM "CollabReportReasons"
            WHERE "CollabReportReasons"."collabReportId" = "CollabReport"."id"
            AND "CollabReportReasons"."deletedAt" IS NULL
          )`),
          'reportReasons',
        ],
        [
          sequelize.literal(`(
            SELECT array_agg("activityStateCode")
            FROM "CollabReportActivityStates"
            WHERE "CollabReportActivityStates"."collabReportId" = "CollabReport"."id"
            AND "CollabReportActivityStates"."deletedAt" IS NULL
          )`),
          'statesInvolved',
        ],
      ],
    },
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
    steps,
    dataUsed,
    activityStates,
    statesInvolved,
    reportGoals,
    ...fields
  } = newReport;

  // Determine whether to update or create
  if (oldReport) {
    savedReport = await update(fields, oldReport);
  } else {
    savedReport = await create(newReport);
  }

  const { id: reportId } = savedReport;

  // Save any CollabReportReasons
  if (reportReasons) {
    await saveReportReasons(reportId, reportReasons);
  }

  // Save any steps
  if (steps) {
    await saveReportSteps(reportId, steps);
  }

  // Save any data used
  if (dataUsed) {
    await saveReportDataUsed(reportId, dataUsed);
  }

  // Save any goals
  if (reportGoals) {
    await saveReportGoals(reportId, reportGoals);
  }

  // Save any activity states
  if (statesInvolved) {
    await saveReportActivityStates(reportId, statesInvolved);
  }

  // If there are specialists, those need to be saved separately
  if (collabReportSpecialists) {
    const specialists = collabReportSpecialists.map(
      (c: { specialistId: number }) => c.specialistId,
    );
    await saveReportSpecialists(reportId, specialists);
  }

  // Sync the approvers, if an empty array they get removed
  if (approvers) {
    await syncCRApprovers(savedReport.id, approvers.map(({ user }) => user.id));
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
        [
          sequelize.literal(`(
            SELECT array_agg("reasonId")
            FROM "CollabReportReasons"
            WHERE "CollabReportReasons"."collabReportId" = "CollabReport"."id"
            AND "CollabReportReasons"."deletedAt" IS NULL
          )`),
          'reportReasons',
        ],
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
