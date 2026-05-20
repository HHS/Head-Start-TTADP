import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import orderGoalsBy from '../../lib/orderGoalsBy';
import {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  CollaboratorType,
  Goal,
  GoalCollaborator,
  GoalFieldResponse,
  GoalStatusChange,
  GoalTemplate,
  Grant,
  Objective,
  Program,
  Recipient,
  Role,
  sequelize,
  Topic,
  User,
  UserRole,
} from '../../models';
import { reduceObjectivesForRecipientRecord } from '../recipient';

export const GOAL_DASHBOARD_CSV_COLUMNS = [
  { key: 'recipientName', header: 'Recipient name' },
  { key: 'grantNumber', header: 'Grant Number' },
  { key: 'region', header: 'Region' },
  { key: 'goalId', header: 'Goal ID' },
  { key: 'goalStatus', header: 'Goal Status' },
  { key: 'goalCreateDate', header: 'Goal Create Date' },
  { key: 'goalCreatorName', header: 'Goal Creator name' },
  { key: 'goalCreatorRole', header: 'Goal Creator role' },
  { key: 'goalCategory', header: 'Goal Category' },
  { key: 'lastTtaDate', header: 'Last TTA Date' },
];

const INCLUDED_STATUSES = ['Not Started', 'In Progress', 'Closed', 'Suspended'];
const DISPLAY_STATUS = {
  'Not Started': 'Not started',
  'In Progress': 'In progress',
  Closed: 'Closed',
  Suspended: 'Suspended',
};
const REASON_STATUSES = ['Closed', 'Suspended'];
const UNKNOWN_REASON = 'Unknown';
const MIN_STANDARD_GOAL_CREATED_AT = '2025-09-09';
const DEFAULT_GOAL_DASHBOARD_PER_PAGE = 10;
const MAX_GOAL_DASHBOARD_PER_PAGE = 50;
const GOAL_DASHBOARD_CSV_BATCH_SIZE = 250;
const GOAL_DASHBOARD_SORT_FIELDS = ['createdOn', 'goalStatus', 'goalCategory'];
const normalizeGoalIds = (goalIds) =>
  [goalIds]
    .flat()
    .filter((goalId) => /^\d+$/.test(String(goalId)))
    .map((goalId) => parseInt(String(goalId), DECIMAL_BASE))
    .filter((goalId) => Number.isInteger(goalId) && goalId > 0);

const CSV_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;

const isoDateToDisplayDate = (date) => {
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
};

const csvDateFromValue = (value) => {
  if (!value) {
    return '';
  }

  const stringValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return isoDateToDisplayDate(stringValue.slice(0, 10));
  }

  const date = new Date(stringValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}/${day}/${year}`;
};

const toPlain = (record) =>
  record && typeof record.toJSON === 'function' ? record.toJSON() : record;

function normalizeGoalDashboardCsvValue(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function sanitizeGoalDashboardCsvValue(value) {
  const stringValue = normalizeGoalDashboardCsvValue(value);

  return CSV_FORMULA_PREFIX_PATTERN.test(stringValue) ? `'${stringValue}` : stringValue;
}

function sanitizeGoalDashboardCsvRow(row) {
  return GOAL_DASHBOARD_CSV_COLUMNS.reduce(
    (sanitizedRow, { key }) => ({
      ...sanitizedRow,
      [key]: sanitizeGoalDashboardCsvValue(row[key]),
    }),
    {}
  );
}

const statusNodeId = (status) => `status:${status}`;
const reasonNodeId = (status, reason) => `reason:${status}:${reason}`;

const percentage = (count, total) => {
  if (!total) {
    return 0;
  }

  return Number(((count / total) * 100).toFixed(2));
};

const sortReasons = (a, b) => b.count - a.count || a.reason.localeCompare(b.reason);

function statusRowsFromCounts(statusCounts, totalGoals) {
  return INCLUDED_STATUSES.map((status) => {
    const count = statusCounts.get(status) || 0;
    return {
      status,
      label: DISPLAY_STATUS[status],
      count,
      percentage: percentage(count, totalGoals),
    };
  });
}

function reasonRowsFromCounts(reasonCountsByStatus, statusCounts) {
  return REASON_STATUSES.flatMap((status) => {
    const statusTotal = statusCounts.get(status) || 0;
    const reasonCounts = reasonCountsByStatus.get(status) || new Map();

    return [...reasonCounts.entries()]
      .map(([reason, count]) => ({
        status,
        statusLabel: DISPLAY_STATUS[status],
        reason,
        count,
        percentage: percentage(count, statusTotal),
      }))
      .sort(sortReasons);
  });
}

function buildSankeyData(totalGoals, statusRows, reasonRows) {
  if (!totalGoals) {
    return {
      nodes: [],
      links: [],
    };
  }

  const nonZeroStatusRows = statusRows.filter((row) => row.count > 0);
  const nonZeroReasonRows = reasonRows.filter((row) => row.count > 0);

  const nodes = [
    {
      id: 'goals',
      label: 'Goals',
      count: totalGoals,
      percentage: percentage(totalGoals, totalGoals),
    },
    ...nonZeroStatusRows.map((row) => ({
      id: statusNodeId(row.status),
      label: row.label,
      count: row.count,
      percentage: row.percentage,
    })),
    ...nonZeroReasonRows.map((row) => ({
      id: reasonNodeId(row.status, row.reason),
      label: row.reason,
      status: row.status,
      count: row.count,
      percentage: row.percentage,
    })),
  ];

  const links = [
    ...nonZeroStatusRows.map((row) => ({
      source: 'goals',
      target: statusNodeId(row.status),
      value: row.count,
    })),
    ...nonZeroReasonRows.map((row) => ({
      source: statusNodeId(row.status),
      target: reasonNodeId(row.status, row.reason),
      value: row.count,
    })),
  ];

  return { nodes, links };
}

function buildReasonCountsForCurrentStatus(goals, statusChanges) {
  const currentStatusByGoal = new Map(goals.map((goal) => [goal.id, goal.status]));
  const reasonCountsByStatus = new Map(REASON_STATUSES.map((status) => [status, new Map()]));
  const seenGoalIds = new Set();

  statusChanges.forEach(({ goalId, newStatus, reason }) => {
    const currentStatus = currentStatusByGoal.get(goalId);

    if (!currentStatus || !REASON_STATUSES.includes(currentStatus) || currentStatus !== newStatus) {
      return;
    }

    if (seenGoalIds.has(goalId)) {
      return;
    }

    const reasonToCount = reason?.trim() || UNKNOWN_REASON;
    const statusCounts = reasonCountsByStatus.get(currentStatus);
    statusCounts.set(reasonToCount, (statusCounts.get(reasonToCount) || 0) + 1);
    seenGoalIds.add(goalId);
  });

  goals.forEach(({ id, status }) => {
    if (!REASON_STATUSES.includes(status) || seenGoalIds.has(id)) {
      return;
    }

    const statusCounts = reasonCountsByStatus.get(status);
    statusCounts.set(UNKNOWN_REASON, (statusCounts.get(UNKNOWN_REASON) || 0) + 1);
  });

  return reasonCountsByStatus;
}

function dashboardGoalWhere(scopes) {
  return {
    [Op.and]: [
      scopes.goal,
      {
        status: {
          [Op.in]: INCLUDED_STATUSES,
        },
      },
      {
        prestandard: false,
      },
      {
        createdAt: {
          [Op.gte]: MIN_STANDARD_GOAL_CREATED_AT,
        },
      },
    ],
  };
}

function goalTemplateInclude() {
  return {
    model: GoalTemplate,
    as: 'goalTemplate',
    attributes: [],
    required: true,
  };
}

function grantRecipientInclude(attributes = []) {
  return {
    model: Grant,
    as: 'grant',
    attributes,
    required: true,
    include: [
      {
        model: Recipient,
        as: 'recipient',
        attributes: attributes.length ? ['id', 'name'] : [],
        required: true,
      },
    ],
  };
}

function orderDashboardGoalsBy(sortBy, direction) {
  const stableIdOrder = [sequelize.col('id'), direction];

  if (sortBy === 'goalCategory') {
    return [
      [sequelize.col('goalTemplate.standard'), direction],
      [sequelize.col('name'), direction],
      [sequelize.col('createdAt'), 'DESC'],
      stableIdOrder,
    ];
  }

  const order = orderGoalsBy(sortBy, direction);
  return sortBy === 'id' ? order : [...order, stableIdOrder];
}

function formatDashboardGoalsQuery(query = {}) {
  const offset = parseInt(query.offset || 0, DECIMAL_BASE);
  const perPage = parseInt(query.perPage || DEFAULT_GOAL_DASHBOARD_PER_PAGE, DECIMAL_BASE);
  const sortBy = GOAL_DASHBOARD_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'goalStatus';
  const direction = String(query.direction).toLowerCase() === 'desc' ? 'desc' : 'asc';
  const goalIds = [...new Set(normalizeGoalIds(query.goalIds))];

  return {
    sortBy,
    direction,
    offset: Number.isNaN(offset) || offset < 0 ? 0 : offset,
    perPage:
      Number.isNaN(perPage) || perPage < 1
        ? DEFAULT_GOAL_DASHBOARD_PER_PAGE
        : Math.min(perPage, MAX_GOAL_DASHBOARD_PER_PAGE),
    includeAllGoalIds: String(query.includeAllGoalIds).toLowerCase() === 'true',
    goalIds,
  };
}

const goalStatusSortAttribute = () => [
  sequelize.literal(`
      CASE
        WHEN COALESCE("Goal"."status",'')  = '' OR "Goal"."status" = 'Needs Status' THEN 1
        WHEN "Goal"."status" = 'Draft' THEN 2
        WHEN "Goal"."status" = 'Not Started' THEN 3
        WHEN "Goal"."status" = 'In Progress' THEN 4
        WHEN "Goal"."status" = 'Suspended' THEN 5
        WHEN "Goal"."status" = 'Closed' THEN 6
        ELSE 7 END`),
  'status_sort',
];

const goalReopenedAttribute = () => [
  sequelize.literal(`(
        SELECT COUNT(*) > 0
        FROM "Goals" g2
        WHERE g2."goalTemplateId" = "Goal"."goalTemplateId"
          AND g2."grantId" = "Goal"."grantId"
          AND g2."status" = 'Closed'
          AND g2."id" != "Goal"."id"
      )`),
  'isReopened',
];

const goalStandardAttribute = () => [sequelize.literal('"goalTemplate"."standard"'), 'standard'];

const dashboardGoalAttributes = () => [
  'id',
  'name',
  'status',
  'createdAt',
  'goalTemplateId',
  'prestandard',
  'onAR',
  'onApprovedAR',
  goalStatusSortAttribute(),
  goalReopenedAttribute(),
  goalStandardAttribute(),
];

const dashboardGoalIdAttributes = () => [
  'id',
  'name',
  'createdAt',
  goalStatusSortAttribute(),
  goalStandardAttribute(),
];

const dashboardGoalIdGroup = [
  'Goal.id',
  'Goal.name',
  'Goal.createdAt',
  'Goal.status',
  'goalTemplate.id',
  'goalTemplate.standard',
];

function requiredDashboardGoalIncludes() {
  return [goalTemplateInclude(), grantRecipientInclude()];
}

async function dashboardGoalCount(where) {
  return Goal.count({
    where,
    include: requiredDashboardGoalIncludes(),
    distinct: true,
    col: 'id',
  });
}

async function dashboardGoalIds(where, order, pagination = {}) {
  const rows = await Goal.findAll({
    attributes: dashboardGoalIdAttributes(),
    where,
    include: requiredDashboardGoalIncludes(),
    order,
    group: dashboardGoalIdGroup,
    subQuery: false,
    raw: true,
    ...pagination,
  });

  return rows.map((row) => row.id);
}

function dashboardGoalCreator(goal) {
  const creator = goal.goalCollaborators?.find(
    ({ collaboratorType }) => collaboratorType?.name === 'Creator'
  );
  const creatorRoles = creator?.user?.userRoles
    ?.map(({ role }) => role?.name)
    .filter(Boolean)
    .join(', ');

  return {
    goalCreatorName: creator?.user?.name || '',
    goalCreatorRole: creatorRoles || '',
  };
}

function dashboardGoalLastTtaDate(goal) {
  const latestApprovedEndDate = goal.activityReports?.reduce((latestDate, activityReport) => {
    if (!activityReport?.endDate) {
      return latestDate;
    }

    if (!latestDate) {
      return activityReport.endDate;
    }

    return new Date(activityReport.endDate) > new Date(latestDate)
      ? activityReport.endDate
      : latestDate;
  }, '');

  return csvDateFromValue(latestApprovedEndDate);
}

function dashboardGoalCsvRows(goalRows) {
  return goalRows.map((goal) => ({
    recipientName: goal.grant?.recipient?.name || '',
    grantNumber: goal.grant?.number || '',
    region: goal.grant?.regionId || '',
    goalId: goal.id || '',
    goalStatus: goal.status || '',
    goalCreateDate: csvDateFromValue(goal.createdAt),
    ...dashboardGoalCreator(goal),
    goalCategory: goal.goalTemplate?.standard || '',
    lastTtaDate: dashboardGoalLastTtaDate(goal),
  }));
}

function orderGoalRowsByIds(goalRows, orderedGoalIds) {
  const goalRowsById = new Map(goalRows.map((goal) => [goal.id, goal]));

  return orderedGoalIds.map((goalId) => goalRowsById.get(goalId)).filter(Boolean);
}

async function fetchGoalDashboardCsvGoalRows(filteredWhere, orderedGoalIds) {
  if (!orderedGoalIds.length) {
    return [];
  }

  const goalRows = await Goal.findAll({
    attributes: ['id', 'status', 'createdAt'],
    where: {
      [Op.and]: [filteredWhere, { id: orderedGoalIds }],
    },
    include: [
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: ['standard'],
        required: true,
      },
      {
        model: Grant,
        as: 'grant',
        attributes: ['number', 'regionId'],
        required: true,
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['name'],
            required: true,
          },
        ],
      },
      {
        model: GoalCollaborator,
        as: 'goalCollaborators',
        attributes: ['id'],
        required: false,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            attributes: ['name'],
            where: {
              name: 'Creator',
            },
          },
          {
            model: User,
            as: 'user',
            attributes: ['name'],
            required: true,
            include: [
              {
                model: UserRole,
                as: 'userRoles',
                attributes: ['id'],
                include: [
                  {
                    model: Role,
                    as: 'role',
                    attributes: ['name'],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: ActivityReport,
        as: 'activityReports',
        attributes: ['id', 'endDate'],
        through: {
          attributes: [],
        },
        required: false,
        where: {
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
      },
    ],
  });

  return orderGoalRowsByIds(goalRows, orderedGoalIds);
}

async function addApprovedObjectiveMetadata(goalRows) {
  const objectiveIds = goalRows.flatMap((goal) =>
    goal.objectives ? goal.objectives.map((objective) => objective.id) : []
  );

  const approvedObjectiveMetaData = objectiveIds.length
    ? await ActivityReportObjective.findAll({
        where: {
          objectiveId: objectiveIds,
        },
        attributes: ['id', 'objectiveId'],
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            attributes: ['id', 'endDate', 'displayId'],
            required: true,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
          },
          {
            model: Topic,
            as: 'topics',
            attributes: ['name'],
            required: false,
          },
          {
            model: ActivityReportObjectiveCitation,
            as: 'activityReportObjectiveCitations',
            required: false,
          },
        ],
        order: [[sequelize.col('activityReport.endDate'), 'DESC']],
      })
    : [];

  const approvedMetaDataByObjectiveId = {};
  approvedObjectiveMetaData.forEach((activityReportObjective) => {
    if (!approvedMetaDataByObjectiveId[activityReportObjective.objectiveId]) {
      approvedMetaDataByObjectiveId[activityReportObjective.objectiveId] = [];
    }

    approvedMetaDataByObjectiveId[activityReportObjective.objectiveId].push({
      id: activityReportObjective.id,
      activityReport: activityReportObjective.activityReport,
      topics: (activityReportObjective.topics || []).flatMap((topic) => topic.name),
      activityReportObjectiveCitations:
        activityReportObjective.activityReportObjectiveCitations || [],
    });
  });

  return goalRows.map((goal) => {
    const plainGoal = toPlain(goal);
    const objectives = (goal.objectives || []).map((objective) => {
      const plainObjective = toPlain(objective);
      return {
        ...plainObjective,
        activityReportObjectives: approvedMetaDataByObjectiveId[objective.id] || [],
      };
    });

    return {
      ...plainGoal,
      objectives,
    };
  });
}

function grantNumberWithProgramTypes(grant) {
  if (!grant) return undefined;
  const programs = grant.programs || [];
  const programTypes = [
    ...new Set(
      programs
        .map((p) => p.programType)
        .filter(Boolean)
        .sort()
    ),
  ];
  return programTypes.length > 0 ? `${grant.number} - ${programTypes.join(', ')}` : grant.number;
}

function formatDashboardGoalRows(goalRows) {
  return goalRows.map((goal) => {
    const grantNumber = grantNumberWithProgramTypes(goal.grant);
    const goalToAdd = {
      id: goal.id,
      ids: [goal.id],
      goalStatus: goal.status,
      createdOn: goal.createdAt,
      goalText: goal.name,
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      grantNumbers: [grantNumber],
    };

    return {
      ...goal,
      createdOn: goal.createdAt,
      grantNumbers: [grantNumber],
      objectives: reduceObjectivesForRecipientRecord(goal, goalToAdd, [grantNumber]),
    };
  });
}

export async function goalDashboard(scopes) {
  const where = dashboardGoalWhere(scopes);

  const [goals, totalGoals] = await Promise.all([
    Goal.findAll({
      where,
      attributes: ['id', 'status'],
      include: requiredDashboardGoalIncludes(),
      group: ['Goal.id', 'Goal.status'],
      raw: true,
    }),
    dashboardGoalCount(where),
  ]);

  const statusCounts = goals.reduce(
    (acc, goal) => {
      acc.set(goal.status, (acc.get(goal.status) || 0) + 1);
      return acc;
    },
    new Map(INCLUDED_STATUSES.map((status) => [status, 0]))
  );
  const reasonCandidateGoalIds = goals
    .filter((goal) => REASON_STATUSES.includes(goal.status))
    .map((goal) => goal.id);

  const statusChanges = reasonCandidateGoalIds.length
    ? await GoalStatusChange.findAll({
        attributes: ['goalId', 'newStatus', 'reason', 'performedAt', 'id'],
        where: {
          goalId: {
            [Op.in]: reasonCandidateGoalIds,
          },
          newStatus: {
            [Op.in]: REASON_STATUSES,
          },
        },
        order: [
          ['goalId', 'ASC'],
          ['performedAt', 'DESC'],
          ['id', 'DESC'],
        ],
        raw: true,
      })
    : [];

  const reasonCountsByStatus = buildReasonCountsForCurrentStatus(goals, statusChanges);
  const statusRows = statusRowsFromCounts(statusCounts, totalGoals);
  const reasonRows = reasonRowsFromCounts(reasonCountsByStatus, statusCounts);

  return {
    goalStatusWithReasons: {
      dataStartDate: MIN_STANDARD_GOAL_CREATED_AT,
      dataStartDateDisplay: isoDateToDisplayDate(MIN_STANDARD_GOAL_CREATED_AT),
      total: totalGoals,
      statusRows,
      reasonRows,
      sankey: buildSankeyData(totalGoals, statusRows, reasonRows),
    },
  };
}

export async function* goalDashboardGoalsCsvRows(scopes, query = {}) {
  const { sortBy, direction, goalIds } = formatDashboardGoalsQuery(query);
  const where = dashboardGoalWhere(scopes);
  const filteredWhere = goalIds.length
    ? {
        [Op.and]: [where, { id: goalIds }],
      }
    : where;
  const order = orderDashboardGoalsBy(sortBy, direction);
  const pagination = {
    limit: GOAL_DASHBOARD_CSV_BATCH_SIZE,
    offset: 0,
  };
  let batchGoalIds = await dashboardGoalIds(filteredWhere, order, pagination);
  if (!batchGoalIds.length) {
    return;
  }
  let orderedGoalRows = await fetchGoalDashboardCsvGoalRows(filteredWhere, batchGoalIds);

  while (batchGoalIds.length) {
    const csvRows = dashboardGoalCsvRows(orderedGoalRows);

    for (const row of csvRows) {
      yield sanitizeGoalDashboardCsvRow(row);
    }

    pagination.offset += GOAL_DASHBOARD_CSV_BATCH_SIZE;
    batchGoalIds = await dashboardGoalIds(filteredWhere, order, pagination);

    if (!batchGoalIds.length) {
      return;
    }

    orderedGoalRows = await fetchGoalDashboardCsvGoalRows(filteredWhere, batchGoalIds);
  }
}

export async function goalDashboardGoals(scopes, query = {}) {
  const { sortBy, direction, offset, perPage, includeAllGoalIds, goalIds } =
    formatDashboardGoalsQuery(query);
  const where = dashboardGoalWhere(scopes);
  const filteredWhere = goalIds.length
    ? {
        [Op.and]: [where, { id: goalIds }],
      }
    : where;
  const order = [
    ...orderDashboardGoalsBy(sortBy, direction),
    [{ model: GoalStatusChange, as: 'statusChanges' }, 'createdAt', 'ASC'],
  ];
  const idOrder = orderDashboardGoalsBy(sortBy, direction);

  const count = await dashboardGoalCount(filteredWhere);
  const pageGoalIds = count
    ? await dashboardGoalIds(
        filteredWhere,
        idOrder,
        goalIds.length ? {} : { limit: perPage, offset }
      )
    : [];
  const allGoalIds =
    includeAllGoalIds && count ? await dashboardGoalIds(filteredWhere, idOrder) : [];

  if (!pageGoalIds.length) {
    return {
      goalDashboardGoals: {
        count,
        goalRows: [],
        allGoalIds,
      },
    };
  }

  const goalRows = await Goal.findAll({
    attributes: dashboardGoalAttributes(),
    where: {
      [Op.and]: [filteredWhere, { id: pageGoalIds }],
    },
    include: [
      goalTemplateInclude(),
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['name'],
                through: [],
              },
            ],
          },
        ],
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: ['response', 'goalId'],
      },
      {
        model: Grant,
        as: 'grant',
        attributes: ['id', 'recipientId', 'regionId', 'number'],
        required: true,
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['id', 'name'],
            required: true,
          },
          {
            model: Program,
            as: 'programs',
            attributes: ['programType'],
          },
        ],
      },
      {
        attributes: ['id', 'title', 'status', 'goalId', 'onApprovedAR'],
        model: Objective,
        as: 'objectives',
        required: false,
        where: {
          [Op.or]: [
            { createdVia: 'rtr' },
            {
              createdVia: 'activityReport',
              onApprovedAR: true,
            },
          ],
        },
        include: [
          {
            attributes: ['id', 'endDate', 'calculatedStatus', 'regionId', 'displayId'],
            model: ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
          },
        ],
      },
    ],
    order,
  });

  const rowsWithMetadata = await addApprovedObjectiveMetadata(goalRows);
  const processedRows = formatDashboardGoalRows(rowsWithMetadata);

  return {
    goalDashboardGoals: {
      count,
      goalRows: processedRows,
      allGoalIds,
    },
  };
}

export default goalDashboard;
