import { Op } from 'sequelize';
import moment from 'moment';
import {
  Grant,
  Recipient,
  Program,
  sequelize,
  Goal,
  ActivityReport,
  ActivityReportObjective,
  Objective,
  // Topic,
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

// todo- reflect other changes in ui
// todo- similar rollup in activityreports fetcher

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
  const { goal: scopes } = filtersToScopes(filters, 'goal');

  // Paging.
  const limitNum = parseInt(limit, 10);
  const offSetNum = parseInt(offset, 10);

  const goals = await Goal.findAll({
    attributes: [
      [sequelize.fn('ARRAY_AGG', sequelize.col('"Goal"."id"')), 'ids'],
      [sequelize.fn('ARRAY_AGG', sequelize.col('"grant"."id"')), 'grantIds'],
      [sequelize.fn('ARRAY_AGG', sequelize.col('"grant"."number"')), 'grantNumbers'],
      [sequelize.literal('CASE WHEN COALESCE("Goal"."status",\'\')  = \'\' OR "Goal"."status" = \'Needs Status\' THEN 1 WHEN "Goal"."status" = \'Not Started\' THEN 2 WHEN "Goal"."status" = \'In Progress\' THEN 3  WHEN "Goal"."status" = \'Closed\' THEN 4 WHEN "Goal"."status" = \'Suspended\' THEN 5 ELSE 6 END'), 'status_sort'],
      'name',
      'createdAt',
      'status',
    ],
    group: ['"Goal"."name"', 'status_sort', '"Goal"."createdAt"', '"Goal"."status'],
    where: {
      onApprovedAR: true,
      [Op.and]: scopes,
    },
    include: [
      {
        model: Grant.unscoped(),
        as: 'grant',
        attributes: [],
        where: {
          regionId,
          recipientId,
        },
      },
    ],
    order: orderGoalsBy(sortBy, sortDir),
  });

  const rows = await Promise.all(goals.map(async (g) => {
    const { grantNumbers, ids: goalIds } = g.dataValues;

    const goalRows = await Goal.findAll({
      attributes: [
        'id',
        'name',
        'status',
        'createdAt',
        'goalNumber',
        'previousStatus',
      ],
      where: {
        id: goalIds,
      },
    });

    const rawObjectives = await Objective.findAll({
      attributes: [
        [sequelize.fn('ARRAY_AGG', sequelize.col('Objective.id')), 'ids'],
        'title',
        'status',
      ],
      where: {
        onApprovedAR: true,
        goalId: goalIds,
      },
      group: ['title', 'status'],
      raw: true,
    });

    const objectives = await Promise.all(rawObjectives.map(async (objectiveGroup) => {
      const activityReports = await ActivityReport.findAll({
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
        as: 'activityReport',
        required: false,
        where: {
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        include: [
          {
            model: Objective,
            as: 'objectivesWithGoals',
            where: {
              id: objectiveGroup.ids,
            },
            attributes: ['id'],
            required: true,
          },
        ],
      });

      const activityReportObjectives = await ActivityReportObjective.findAll({
        attributes: ['ttaProvided'],
        where: {
          objectiveId: objectiveGroup.ids,
        },
      });

      return {
        ...objectiveGroup,
        activityReportObjective: activityReportObjectives,
        activityReports,
      };
    }));

    // return goalRows;
    return goalRows.reduce((previous, current) => {
      const { goalNumber, dataValues } = current;

      return {
        ...previous,
        ...dataValues,
        goalNumbers: [...previous.goalNumbers, goalNumber],
      };
    }, {
      goalNumbers: [],
      objectives,
      grantNumbers,
    });
  }));

  // Build Array of Goals.
  const goalRows = [];
  let goalCount = 0;
  const count = rows.length;

  // Handle Paging.
  if (offset > 0) {
    rows.splice(0, offSetNum);
  }

  rows.forEach((g) => {
    if (goalCount === limitNum) {
      return;
    }

    const goalToAdd = {
      id: g.id,
      goalStatus: g.status,
      createdOn: g.createdAt,
      goalText: g.name,
      goalNumbers: g.goalNumbers,
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      objectives: [],
      previousStatus: calculatePreviousStatus(g),
    };

    // Objectives.
    g.objectives.forEach((o) => {
      // Activity Report.
      let activityReport;
      if (o.activityReports && o.activityReports.length > 0) {
        // eslint-disable-next-line prefer-destructuring
        activityReport = o.activityReports[0];
        /* TODO: Switch for New Goal Creation (Remove). */
        goalToAdd.goalTopics = Array.from(
          new Set([...goalToAdd.goalTopics, ...activityReport.topics]),
        );

        goalToAdd.reasons = Array.from(
          new Set([...goalToAdd.reasons, ...activityReport.reason]),
        );
      }

      // Add Objective.
      goalToAdd.objectives.push({
        id: o.id,
        title: o.title,
        arId: activityReport ? activityReport.id : null,
        arNumber: activityReport ? activityReport.displayId : null,
        arStatus: activityReport ? activityReport.calculatedStatus : null,
        arLegacyId: activityReport ? activityReport.legacyId : null,
        ttaProvided: o.ttaProvided,
        endDate: activityReport ? activityReport.endDate : null,
        reasons: activityReport ? activityReport.reason : null,
        status: o.status,
        activityReportObjectives: o.activityReportObjectives,
        grantNumbers: g.grantNumbers,
      });
    });
    // Sort Objectives by end date desc.
    goalToAdd.objectives.sort((a, b) => ((
      a.endDate === b.endDate ? a.id < b.id
        : a.endDate < b.endDate) ? 1 : -1));
    goalToAdd.objectiveCount = goalToAdd.objectives.length;
    goalRows.push(goalToAdd);
    goalCount += 1;
  });

  return { count, goalRows };
}
