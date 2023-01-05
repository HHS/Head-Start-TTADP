import { Op } from 'sequelize';
import { uniq, uniqBy } from 'lodash';
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
import {
  RECIPIENTS_PER_PAGE,
  GOALS_PER_PAGE,
  REPORT_STATUSES,
  GOAL_STATUS,
} from '../constants';
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
    attributes: ['id', 'name', 'recipientType', 'uei'],
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

/**
 *
 * @param {Object} currentModel
 * Current goal model we are working on
 * @param {Object} goal
 * a goal, either an pre built one or one we are building on the fly as we reduce goals
 * @param {String[]} grantNumbers
 * passed into here to avoid having to refigure anything else, they come from the goal
 * @returns {Object[]} sorted objectives
 */
function reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers) {
  // we need to reduce out the objectives, topics, and reasons
  // 1) we need to return the objectives
  // 2) we need to attach the topics and reasons to the goal

  const {
    objectives,
    topics,
    reasons,
  } = [
    ...(currentModel.objectives || []),
    ...(goal.objectives || [])]
    .reduce((acc, objective) => {
    // this secondary reduction is to extract what we need from the activity reports
    // ( topic, reason, latest endDate)
      const { t, r, endDate } = (objective.activityReports || []).reduce((a, report) => ({
        t: [...a.t, ...report.topics],
        r: [...a.r, ...report.reason],
        endDate: new Date(report.endDate) > new Date(a.endDate) ? report.endDate : a.endDate,
      }), { t: [], r: [], endDate: '' });

      // previous added objectives have a regularly accessible attribute, the others
      // for some reason need to be accessed by the getDataValue method
      const objectiveTitle = objective.getDataValue ? objective.getDataValue('title') : objective.title;
      const objectiveStatus = objective.getDataValue ? objective.getDataValue('status') : objective.status;

      const existing = acc.objectives.find((o) => (
        o.title === objectiveTitle.trim() && o.status === objectiveStatus
      ));

      // get our objective topics
      const objectiveTopics = (objective.topics || []).map((ot) => ot.name);

      if (existing) {
        existing.activityReports = uniqBy([...existing.activityReports, ...objective.activityReports], 'displayId');
        existing.reasons = uniq([...existing.reasons, ...r]);
        existing.reasons.sort();
        existing.grantNumbers = grantNumbers;
        return { ...acc, topics: [...acc.topics, ...objectiveTopics] };
      }

      return {
        objectives: [...acc.objectives, {
          ...objective.dataValues,
          title: objective.title.trim(),
          endDate,
          grantNumbers: [currentModel.grant.number],
          reasons: uniq(r),
          activityReports: objective.activityReports || [],
        }],
        reasons: [...acc.reasons, ...r].sort(),
        topics: [...acc.topics, ...t, ...objectiveTopics],
      };
    }, {
      objectives: [],
      topics: [],
      reasons: [],
    });

  const current = goal;
  current.goalTopics = uniq([...goal.goalTopics, ...topics]);
  current.goalTopics.sort();

  current.reasons = uniq([...goal.reasons, ...reasons]);
  current.reasons.sort();

  return objectives.sort((a, b) => ((
    a.endDate === b.endDate ? a.id < b.id
      : new Date(a.endDate) < new Date(b.endDate)) ? 1 : -1));
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
    goalIds = [],
    ...filters
  },
) {
  // Scopes.
  const { goal: scopes } = filtersToScopes(filters, { goal: { recipientId } });

  // Paging.
  const limitNum = parseInt(limit, 10);
  const offSetNum = parseInt(offset, 10);

  // Goal where.
  let goalWhere = {
    [Op.or]: [
      { onApprovedAR: true },
      { isFromSmartsheetTtaPlan: true },
      { createdVia: 'rtr' },
    ],
    [Op.and]: scopes,
  };

  // If we have specified goals only retrieve those else all for recipient.
  if (goalIds && goalIds.length) {
    goalWhere = {
      id: goalIds,
      ...goalWhere,
    };
  }

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
      'isRttapa',
      [sequelize.literal('CASE WHEN COALESCE("Goal"."status",\'\')  = \'\' OR "Goal"."status" = \'Needs Status\' THEN 1 WHEN "Goal"."status" = \'Draft\' THEN 2 WHEN "Goal"."status" = \'Not Started\' THEN 3 WHEN "Goal"."status" = \'In Progress\' THEN 4 WHEN "Goal"."status" = \'Closed\' THEN 5 WHEN "Goal"."status" = \'Suspended\' THEN 6 ELSE 7 END'), 'status_sort'],
    ],
    where: goalWhere,
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

  let sorted = rows;

  if (sortBy === 'goalStatus') {
    // order determined by the statuses in the GOAL_STATUS constant
    const ascOrder = Object.values(GOAL_STATUS).map((s) => s.toLowerCase());
    const descOrder = Array.from(ascOrder).reverse();

    sorted = rows.sort((a, b) => {
      // if for some reason status is falsy, we sort last
      if (!a.status || !b.status) return 1;

      const aStatus = a.status.toLowerCase();
      const bStatus = b.status.toLowerCase();
      // if we found some weird status that for some reason isn't in ascOrder, sort it last
      if (!ascOrder.includes(aStatus) || !ascOrder.includes(bStatus)) return 1;

      return sortDir.toLowerCase() === 'asc'
        ? ascOrder.indexOf(aStatus) - ascOrder.indexOf(bStatus)
        : descOrder.indexOf(aStatus) - descOrder.indexOf(bStatus);
    });
  }

  const allGoalIds = [];

  const r = sorted.reduce((previous, current) => {
    const existingGoal = previous.goalRows.find(
      (g) => g.goalStatus === current.status
        && g.goalText.trim() === current.name.trim()
        && g.isRttapa === current.isRttapa,
    );

    allGoalIds.push(current.id);

    if (existingGoal) {
      existingGoal.ids = [...existingGoal.ids, current.id];
      existingGoal.goalNumbers = [...existingGoal.goalNumbers, current.goalNumber];
      existingGoal.grantNumbers = uniq([...existingGoal.grantNumbers, current.grant.number]);
      existingGoal.objectives = reduceObjectivesForRecipientRecord(
        current,
        existingGoal,
        existingGoal.grantNumbers,
      );
      existingGoal.objectiveCount = existingGoal.objectives.length;
      return {
        goalRows: previous.goalRows,
      };
    }

    const goalToAdd = {
      id: current.id,
      ids: [current.id],
      goalStatus: current.status,
      createdOn: current.createdAt,
      goalText: current.name.trim(),
      goalNumbers: [current.goalNumber],
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      previousStatus: calculatePreviousStatus(current),
      objectives: [],
      grantNumbers: [current.grant.number],
      isRttapa: current.isRttapa,
    };

    goalToAdd.objectives = reduceObjectivesForRecipientRecord(
      current,
      goalToAdd,
      [current.grant.number],
    );
    goalToAdd.objectiveCount = goalToAdd.objectives.length;

    return {
      goalRows: [...previous.goalRows, goalToAdd],
    };
  }, {
    goalRows: [],
  });

  const statuses = await goalStatusGraph({
    goal: {
      id: allGoalIds,
    },
  });

  if (limitNum) {
    return {
      count: r.goalRows.length,
      goalRows: r.goalRows.slice(offSetNum, offSetNum + limitNum),
      statuses,
      allGoalIds,
    };
  }

  return {
    count: r.goalRows.length,
    goalRows: r.goalRows.slice(offSetNum),
    statuses,
    allGoalIds,
  };
}
