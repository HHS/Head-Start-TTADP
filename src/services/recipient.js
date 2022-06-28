import { Op } from 'sequelize';
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
} from '../models';
import orderRecipientsBy from '../lib/orderRecipientsBy';
import { RECIPIENTS_PER_PAGE, GOALS_PER_PAGE, REPORT_STATUSES } from '../constants';
import filtersToScopes from '../scopes';
import orderGoalsBy from '../lib/orderGoalsBy';

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

function reduceObjectives(response, goal) {
  const current = goal;

  const objectives = response.objectives.map((objective) => {
    // Activity Report.
    let activityReport;
    if (objective.activityReports && objective.activityReports.length > 0) {
      // eslint-disable-next-line prefer-destructuring
      activityReport = objective.activityReports[0];
      /* TODO: Switch for New Goal Creation (Remove). */
      current.goalTopics = Array.from(
        new Set([...goal.goalTopics, ...activityReport.topics]),
      );

      current.reasons = Array.from(
        new Set([...goal.reasons, ...activityReport.reason]),
      );
    }

    // eslint-disable-next-line max-len
    const existingObjective = goal.objectives.find((o) => (o.title.trim() === objective.title.trim() && o.status === objective.status));

    if (existingObjective) {
      // eslint-disable-next-line max-len
      const existingReport = existingObjective.activityReports.find((ar) => ar.id === activityReport.id);
      if (existingReport) {
        return {
          ...existingObjective,
          grantNumbers: [...existingObjective.grantNumbers, response.grant.number],
        };
      }

      return {
        ...existingObjective,
        activityReports: [
          ...existingObjective.activityReports,
          {
            id: activityReport ? activityReport.id : null,
            legacyId: activityReport ? activityReport.legacyId : null,
            number: activityReport ? activityReport.displayId : null,
          },
        ],
        grantNumbers: [...existingObjective.grantNumbers, response.grant.number],
      };
    }

    return {
      id: objective.id,
      title: objective.title.trim(),
      endDate: activityReport ? activityReport.endDate : null,
      reasons: activityReport ? activityReport.reason : null,
      status: objective.status,
      grantNumbers: [response.grant.number],
      activityReports: [{
        id: activityReport ? activityReport.id : null,
        legacyId: activityReport ? activityReport.legacyId : null,
        number: activityReport ? activityReport.displayId : null,
      }],
    };
  });

  // this is to dedupe (our first pass dedupes objectives from rolled up goals,
  // this dedupes objectives from the same goal)
  return objectives.reduce((previous, objective) => {
    // eslint-disable-next-line max-len
    const existingObjective = previous.find((o) => (o.title.trim() === objective.title.trim() && o.status === objective.status));

    if (existingObjective) {
      // if the objective exists, we also have to make sure all
      // the reports are combined into one list

      // eslint-disable-next-line max-len
      existingObjective.activityReports = objective.activityReports.reduce((existingReports, currentReport) => {
        const existingReport = existingReports.find((report) => report.id === currentReport.id);
        if (existingReport) {
          return existingReports;
        }

        return [...existingReports, currentReport];
      }, existingObjective.activityReports);
      return previous;
    }

    return [
      ...previous,
      objective,
    ];
  }, []).sort((a, b) => ((
    a.endDate === b.endDate ? a.id < b.id
      : a.endDate < b.endDate) ? 1 : -1)); // we also have to sort the objectives
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
      // [sequelize.fn('ARRAY_AGG', sequelize.col('"grant"."number"')), 'grantNumbers'],
      [sequelize.literal('CASE WHEN COALESCE("Goal"."status",\'\')  = \'\' OR "Goal"."status" = \'Needs Status\' THEN 1 WHEN "Goal"."status" = \'Not Started\' THEN 2 WHEN "Goal"."status" = \'In Progress\' THEN 3  WHEN "Goal"."status" = \'Closed\' THEN 4 WHEN "Goal"."status" = \'Suspended\' THEN 5 ELSE 6 END'), 'status_sort'],
    ],
    where: {
      onApprovedAR: true,
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
        where: {
          onApprovedAR: true,
        },
        include: [
          {
            attributes: [
              'id',
              'reason',
              'topics',
              'endDate',
              'calculatedStatus',
              'legacyId',
              'regionId',
            ],
            model: ActivityReport,
            as: 'activityReports',
            required: true,
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

  const r = rows.reduce((previous, current) => {
    const existingGoal = previous.goalRows.find(
      (g) => g.goalStatus === current.status && g.goalText.trim() === current.name.trim(),
    );

    if (existingGoal) {
      existingGoal.ids = [...existingGoal.ids, current.id];
      existingGoal.goalNumbers = [...existingGoal.goalNumbers, current.goalNumber];
      existingGoal.objectives = reduceObjectives(current, existingGoal);
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
    };

    goalToAdd.objectives = reduceObjectives(current, goalToAdd);
    goalToAdd.objectiveCount = goalToAdd.objectives.length;

    return {
      goalRows: [...previous.goalRows, goalToAdd],
    };
  }, {
    goalRows: [],
  });

  if (limitNum) {
    return {
      count: r.goalRows.length,
      goalRows: r.goalRows.slice(offSetNum, offSetNum + limitNum),
    };
  }

  return {
    count: r.goalRows.length,
    goalRows: r.goalRows.slice(offSetNum),
  };
}
