import { Op } from 'sequelize';
import { uniq } from 'lodash';
import moment from 'moment';
import {
  Grant,
  Recipient,
  Program,
  sequelize,
  Goal,
  ActivityReport,
  Objective,
  ActivityRecipient,
  Topic,
} from '../models';
import orderRecipientsBy from '../lib/orderRecipientsBy';
import { RECIPIENTS_PER_PAGE, GOALS_PER_PAGE, REPORT_STATUSES } from '../constants';
import filtersToScopes from '../scopes';
import orderGoalsBy from '../lib/orderGoalsBy';
import goalStatusGraph from '../widgets/goalStatusGraph';

export async function allRecipients() {
  return Recipient.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

const todaysDate = moment().format('MM/DD/yyyy');

export async function recipientById(recipientId, grantScopes) {
  return Recipient.findOne({
    attributes: ['id', 'name', 'recipientType'],
    where: {
      id: recipientId,
    },
    include: [
      {
        attributes: [
          'id',
          'number',
          'regionId',
          'status',
          'startDate',
          'endDate',
          'programSpecialistName',
          'grantSpecialistName',
          'recipientId',
          'annualFundingMonth',
          'numberWithProgramTypes',
        ],
        model: Grant.unscoped(),
        as: 'grants',
        where: [{
          [Op.and]: [
            { [Op.and]: grantScopes },
            {
              [Op.or]: [
                {
                  status: 'Active',
                },
                {
                  endDate: {
                    [Op.between]: ['2020-09-01', todaysDate],
                  },
                },
              ],
            },
          ],
        }],
        include: [
          {
            attributes: ['name', 'programType'],
            model: Program,
            as: 'programs',
          },
        ],
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'status', 'ASC'], [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'], [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
    ],
  });
}

/**
 *
 * @param {string} query
 * @param {number} regionId
 * @param {string} sortBy
 *
 * @returns {Promise} recipient results
 */
export async function recipientsByName(query, scopes, sortBy, direction, offset) {
  // fix the query
  const q = `%${query}%`;
  const limit = RECIPIENTS_PER_PAGE;

  const rows = await Recipient.findAll({
    attributes: [
      [sequelize.literal('DISTINCT COUNT(*) OVER()'), 'count'],
      sequelize.literal('STRING_AGG(DISTINCT "grants"."programSpecialistName", \', \' order by "grants"."programSpecialistName") as "programSpecialists"'),
      sequelize.literal('STRING_AGG(DISTINCT "grants"."grantSpecialistName", \', \' order by "grants"."grantSpecialistName") as "grantSpecialists"'),
      [sequelize.col('grants.regionId'), 'regionId'],
      'id',
      'name',
      'recipientType',
    ],
    where: {
      [Op.or]: [
        {
          name: {
            [Op.iLike]: q,
          },
        },
        {
          [Op.and]: [
            { '$grants.number$': { [Op.iLike]: q } },
          ],
        },
      ],
    },
    include: [{
      attributes: [],
      model: Grant.unscoped(),
      as: 'grants',
      required: true,
      where: [{
        [Op.and]: [
          { [Op.and]: scopes },
          {
            [Op.or]: [
              {
                status: 'Active',
              },
              {
                endDate: {
                  [Op.between]: ['2020-08-31', todaysDate],
                },
              },
            ],
          },
        ],
      }],
    }],
    subQuery: false,
    raw: true,
    group: [
      'grants.regionId',
      'Recipient.id',
    ],
    limit,
    offset,
    order: orderRecipientsBy(sortBy, direction),
  });

  // handle zero results
  const firstRow = rows[0];
  const count = firstRow ? firstRow.count : 0;

  return {
    count: parseInt(count, 10),
    rows,
  };
}

function formatObjectivesForRtr(currentGoal, goalToAdd) {
  let topics = [];
  let reasons = [];
  const objectives = currentGoal.objectives.map((objective) => {
    const { t, r, endDate } = objective.activityReports.reduce((a, report) => ({
      t: [...a.t, ...report.topics],
      r: [...a.r, ...report.reason],
      endDate: report.endDate > a.endDate ? report.endDate : a.endDate,
    }), { t: [], r: [], endDate: '' });

    const ots = objective.topics.map((ot) => ot.name);

    reasons = [...reasons, ...r];
    topics = [...topics, ...t, ...ots];

    return {
      ...objective.dataValues,
      endDate,
      grantNumbers: [currentGoal.grant.number],
      reasons: uniq(r),
    };
  });

  const goal = goalToAdd;
  goal.goalTopics = uniq(topics);
  goal.goalTopics.sort();

  goal.reasons = uniq(reasons);
  goal.reasons.sort();

  return objectives.sort((a, b) => ((
    a.endDate === b.endDate ? a.id < b.id
      : a.endDate < b.endDate) ? 1 : -1));
}

function calculatePreviousStatus(goal) {
  // if we have a previous status recorded, return that
  if (goal.previousStatus) {
    return goal.previousStatus;
  }

  // otherwise we check to see if there is the goal is on an activity report,
  // and also check the status
  if (goal.objectives.length) {
    const onAr = goal.objectives.some((objective) => objective.activityReports.length);
    const isCompletedOrInProgress = goal.objectives.some((objective) => objective.status === 'In Progress' || objective.status === 'Complete');

    if (onAr && isCompletedOrInProgress) {
      return 'In Progress';
    }

    if (onAr && !isCompletedOrInProgress) {
      return 'Not Started';
    }
  }

  return null;
}

export async function getGoalsByActivityRecipient(
  recipientId,
  regionId,
  {
    sortBy = 'goalStatus',
    sortDir = 'desc',
    offset = 0,
    limit = GOALS_PER_PAGE,
    ...filters
  },
) {
  // Scopes.
  const { goal: scopes } = filtersToScopes(filters, { goal: { recipientId } });

  // Paging.
  const limitNum = parseInt(limit, 10);
  const offSetNum = parseInt(offset, 10);

  // Get Goals.
  const rows = await Goal.findAll({
    attributes: [
      'id',
      'name',
      'status',
      'createdAt',
      'goalNumber',
      'previousStatus',
      'onApprovedAR',
      [sequelize.literal('CASE WHEN COALESCE("Goal"."status",\'\')  = \'\' OR "Goal"."status" = \'Needs Status\' THEN 1 WHEN "Goal"."status" = \'Draft\' THEN 2 WHEN "Goal"."status" = \'Not Started\' THEN 3 WHEN "Goal"."status" = \'In Progress\' THEN 4 WHEN "Goal"."status" = \'Closed\' THEN 5 WHEN "Goal"."status" = \'Suspended\' THEN 6 ELSE 7 END'), 'status_sort'],
    ],
    where: {
      [Op.or]: [
        { onApprovedAR: true },
        { isFromSmartsheetTtaPlan: true },
        { createdVia: 'rtr' },
      ],
      [Op.and]: scopes,
    },
    include: [
      {
        model: Grant,
        as: 'grant',
        attributes: [
          'id', 'recipientId', 'regionId', 'number',
        ],
        where: {
          regionId,
          recipientId,
        },
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
        include: [
          {
            model: Topic,
            as: 'topics',
          },
          {
            attributes: [
              'id',
              'reason',
              'topics',
              'endDate',
              'calculatedStatus',
              'legacyId',
              'regionId',
              'displayId',
            ],
            model: ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
            include: [
              {
                model: ActivityRecipient,
                as: 'activityRecipients',
                attributes: ['activityReportId', 'grantId'],
                required: true,
                include: [
                  {
                    required: true,
                    model: Grant,
                    as: 'grant',
                    attributes: ['id', 'recipientId'],
                    where: {
                      recipientId,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: orderGoalsBy(sortBy, sortDir),
  });

  const allGoalIds = [];

  const r = rows.map((goal) => {
    // store id for graph
    allGoalIds.push(goal.id);

    // format goal for response
    const goalToAdd = {
      id: goal.id,
      ids: [goal.id],
      goalStatus: goal.status,
      createdOn: goal.createdAt,
      goalText: goal.name.trim(),
      goalNumbers: [goal.goalNumber],
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      previousStatus: calculatePreviousStatus(goal),
      objectives: [],
      grantNumbers: [goal.grant.number],
    };

    // format objectives for response
    goalToAdd.objectives = formatObjectivesForRtr(goal, goalToAdd);
    goalToAdd.objectiveCount = goalToAdd.objectives.length;

    return goalToAdd;
  });

  const statuses = await goalStatusGraph({
    goal: {
      id: allGoalIds,
    },
  });

  if (limitNum) {
    return {
      count: r.length,
      goalRows: r.slice(offSetNum, offSetNum + limitNum),
      statuses,
    };
  }

  return {
    count: r.length,
    goalRows: r.slice(offSetNum),
    statuses,
  };
}
