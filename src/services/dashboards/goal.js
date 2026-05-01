import { Op } from 'sequelize';
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import {
  sequelize,
  Goal,
  GoalStatusChange,
  Grant,
  Recipient,
  ActivityReport,
  GoalTemplate,
  GoalFieldResponse,
  User,
  Role,
  Objective,
  ActivityReportObjective,
  Topic,
  ActivityReportObjectiveCitation,
} from '../../models';
import orderGoalsBy from '../../lib/orderGoalsBy';
import { reduceObjectivesForRecipientRecord } from '../recipient';

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
const GOAL_DASHBOARD_SORT_FIELDS = ['createdOn', 'goalStatus', 'goalCategory'];

const isoDateToDisplayDate = (date) => {
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
};

const toPlain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : record);

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
    ...nonZeroStatusRows
      .map((row) => ({ source: 'goals', target: statusNodeId(row.status), value: row.count })),
    ...nonZeroReasonRows
      .map((row) => ({
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

function approvedActivityReportInclude() {
  return {
    model: ActivityReport,
    as: 'activityReports',
    required: true,
    attributes: [],
    through: {
      attributes: [],
    },
    where: {
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
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
  if (sortBy === 'goalCategory') {
    return [
      [sequelize.col('goalTemplate.standard'), direction],
      [sequelize.col('name'), direction],
      [sequelize.col('createdAt'), 'DESC'],
    ];
  }

  return orderGoalsBy(sortBy, direction);
}

function formatDashboardGoalsQuery(query = {}) {
  const offset = parseInt(query.offset || 0, DECIMAL_BASE);
  const perPage = parseInt(query.perPage || DEFAULT_GOAL_DASHBOARD_PER_PAGE, DECIMAL_BASE);
  const sortBy = GOAL_DASHBOARD_SORT_FIELDS.includes(query.sortBy)
    ? query.sortBy
    : 'goalStatus';
  const direction = String(query.direction).toLowerCase() === 'desc' ? 'desc' : 'asc';

  return {
    sortBy,
    direction,
    offset: Number.isNaN(offset) || offset < 0 ? 0 : offset,
    perPage: Number.isNaN(perPage) || perPage < 1
      ? DEFAULT_GOAL_DASHBOARD_PER_PAGE
      : Math.min(perPage, MAX_GOAL_DASHBOARD_PER_PAGE),
    includeAllGoalIds: String(query.includeAllGoalIds).toLowerCase() === 'true',
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

const goalStandardAttribute = () => [
  sequelize.literal('"goalTemplate"."standard"'),
  'standard',
];

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
  return [
    approvedActivityReportInclude(),
    goalTemplateInclude(),
    grantRecipientInclude(),
  ];
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

async function addApprovedObjectiveMetadata(goalRows) {
  const objectiveIds = goalRows.flatMap((goal) => (
    goal.objectives ? goal.objectives.map((objective) => objective.id) : []
  ));

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
      order: [
        [sequelize.col('activityReport.endDate'), 'DESC'],
      ],
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

function formatDashboardGoalRows(goalRows) {
  return goalRows.map((goal) => {
    const goalToAdd = {
      id: goal.id,
      ids: [goal.id],
      goalStatus: goal.status,
      createdOn: goal.createdAt,
      goalText: goal.name,
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      grantNumbers: [goal.grant?.number],
    };

    return {
      ...goal,
      objectives: reduceObjectivesForRecipientRecord(
        goal,
        goalToAdd,
        [goal.grant?.number],
      ),
    };
  });
}

export async function goalDashboard(scopes) {
  const goals = await Goal.findAll({
    where: {
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
    },
    attributes: ['id', 'status'],
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: true,
        attributes: [],
        through: {
          attributes: [],
        },
        where: {
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
      },
      {
        model: Grant,
        as: 'grant',
        required: true,
        attributes: [],
        include: [
          {
            model: Recipient,
            as: 'recipient',
            required: true,
            attributes: [],
          },
        ],
      },
    ],
    group: ['Goal.id', 'Goal.status'],
    raw: true,
  });

  const statusCounts = goals.reduce((acc, goal) => {
    acc.set(goal.status, (acc.get(goal.status) || 0) + 1);
    return acc;
  }, new Map(INCLUDED_STATUSES.map((status) => [status, 0])));

  const totalGoals = goals.length;
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

export async function goalDashboardGoals(scopes, query = {}) {
  const {
    sortBy,
    direction,
    offset,
    perPage,
    includeAllGoalIds,
  } = formatDashboardGoalsQuery(query);
  const where = dashboardGoalWhere(scopes);
  const order = [
    ...orderDashboardGoalsBy(sortBy, direction),
    [{ model: GoalStatusChange, as: 'statusChanges' }, 'createdAt', 'ASC'],
  ];
  const idOrder = orderDashboardGoalsBy(sortBy, direction);

  const count = await dashboardGoalCount(where);
  const pageGoalIds = count
    ? await dashboardGoalIds(where, idOrder, { limit: perPage, offset })
    : [];
  const allGoalIds = includeAllGoalIds && count
    ? await dashboardGoalIds(where, idOrder)
    : [];

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
      [Op.and]: [
        where,
        { id: pageGoalIds },
      ],
    },
    include: [
      approvedActivityReportInclude(),
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
            include: [{
              model: Role,
              as: 'roles',
              attributes: ['name'],
              through: [],
            }],
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
        attributes: [
          'id',
          'recipientId',
          'regionId',
          'number',
        ],
        required: true,
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['id', 'name'],
            required: true,
          },
        ],
      },
      {
        attributes: [
          'id',
          'title',
          'status',
          'goalId',
          'onApprovedAR',
        ],
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
            attributes: [
              'id',
              'endDate',
              'calculatedStatus',
              'regionId',
              'displayId',
            ],
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
