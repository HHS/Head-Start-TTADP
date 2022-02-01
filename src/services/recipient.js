import { Op } from 'sequelize';
import moment from 'moment';
import {
  Grant,
  Recipient,
  Program,
  sequelize,
  Goal,
  ActivityReport,
  ActivityRecipient,
  Objective,
} from '../models';
import orderRecipientsBy from '../lib/orderRecipientsBy';
import { RECIPIENTS_PER_PAGE, GOALS_PER_PAGE } from '../constants';
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
        ],
        model: Grant,
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
      model: Grant,
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
                  [Op.between]: ['2020-09-01', todaysDate],
                },
              },
            ],
          },
        ],
      }],
    }],
    subQuery: false,
    // raw: true,
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

export async function getGoalsByActivityRecipient(
  recipientId,
  {
    sortBy = 'createdOn', sortDir = 'desc', offset = 0, limit = GOALS_PER_PAGE, ...filters
  },
) {
  // Scopes.
  const scopes = filtersToScopes(filters, 'goal');

  // Paging.
  const limitNum = parseInt(limit, 10);
  const offSetNum = parseInt(offset, 10);

  // Get Goals.
  const rows = await Goal.findAll({
    required: true,
    attributes: ['id', 'name', 'status', 'createdAt'],
    where: {
      [Op.and]: scopes,
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['id', 'recipientId'],
        required: true,
        where: { recipientId },
        duplicating: true,
        include: [
          {
            attributes: ['id', 'activityReportId', 'grantId'],
            model: ActivityRecipient,
            as: 'activityRecipients',
            required: true,
            include: [
              {
                attributes: ['id', 'reason', 'topics', 'regionId', 'endDate'],
                model: ActivityReport,
                required: true,
                include: [
                  {
                    attributes: ['id', 'title', 'ttaProvided', 'status', 'goalId'],
                    model: Objective,
                    as: 'objectives',
                    required: true,
                    where: { goalId: { [Op.eq]: sequelize.col('Goal.id') } },
                  },
                ],
              }],
          },
        ],
      }],
    order: orderGoalsBy(sortBy, sortDir),
    distinct: true,
    subQuery: false,
  });

  // Build Array of Goals.
  const goalRows = [];
  let goalCount = 0;
  const count = rows.length;

  /*
    We need to handle paging ourselves.
    If subQuery: false is not set
    query perf drops dramatically.
  */
  // Offset our rows array.
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
      goalNumber: '',
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      objectives: [],
    };
    // Grants.
    if (g.grants) {
      g.grants.forEach((gr) => {
        // Activity Recipients.
        if (gr.activityRecipients) {
          gr.activityRecipients.forEach((a) => {
            // Activity Report.
            if (a.ActivityReport) {
              goalToAdd.goalNumber = `R${a.ActivityReport.regionId}-G-${g.id}`;
              goalToAdd.goalTopics = a.ActivityReport.topics;
              goalToAdd.reasons = a.ActivityReport.reason;
              // Objectives.
              if (a.ActivityReport.objectives) {
                goalToAdd.objectiveCount = a.ActivityReport.objectives.length;
                if (a.ActivityReport.objectives) {
                  a.ActivityReport.objectives.forEach((o) => {
                    goalToAdd.objectives.push({
                      id: o.id,
                      title: o.title,
                      arNumber: a.displayId,
                      ttaProvided: o.ttaProvided,
                      endDate: a.ActivityReport.endDate,
                      reasons: a.ActivityReport.reason,
                      status: o.status,
                    });
                  });
                }
              }
            }
          });
        }
      });
    }
    goalRows.push(goalToAdd);
    goalCount += 1;
  });

  return { count, goalRows };
}

export async function updateRecipientGoalStatusById(goalId, newStatus) {
  await Goal.update(
    { status: newStatus },
    { where: { id: goalId } },
  );
  return Goal.findOne({ where: { id: goalId } });
}
