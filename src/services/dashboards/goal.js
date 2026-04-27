import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  Goal,
  GoalStatusChange,
  Grant,
  Recipient,
  ActivityReport,
} from '../../models';

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
      total: totalGoals,
      statusRows,
      reasonRows,
      sankey: buildSankeyData(totalGoals, statusRows, reasonRows),
    },
  };
}

export default goalDashboard;
