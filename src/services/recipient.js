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
  ActivityReportObjective,
  Objective,
} from '../models';
import orderRecipientsBy from '../lib/orderRecipientsBy';
import { RECIPIENTS_PER_PAGE, GOALS_PER_PAGE } from '../constants';
import filtersToScopes from '../scopes';
import orderReportsBy from '../lib/orderReportsBy';

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
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'grantSpecialistName', 'recipientId'],
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

export function getGoalsByActivityRecipient(
  recipientId,
  {
    sortBy = 'createdAt', sortDir = 'desc', offset = 0, limit = GOALS_PER_PAGE, ...filters
  },
) {
  const scopes = filtersToScopes(filters);
  const res = Recipient.findAndCountAll(
    {
      where: {
        id: recipientId,
      },
      attributes: [
        'id',
      ],
      include: [
        {
          attributes: ['id'],
          model: Grant,
          as: 'grants',
          required: true,
          where: {
            status: 'Active',
          },
          include: [
            {
              attributes: ['id', 'name', 'status', 'createdAt'],
              model: Goal,
              as: 'goals',
              required: true,
              //limit,
            },
            {
              attributes: ['id', 'activityReportId', 'grantId'],
              model: ActivityRecipient,
              as: 'activityRecipients',
              required: true,
              include: [
                {
                  attributes: ['id', 'reason', 'topics'],
                  model: ActivityReport,
                  as: 'ActivityReport',
                  required: true,
                  include: [
                    {
                      attributes: ['id', 'title', 'ttaProvided'],
                      model: Objective,
                      as: 'objectives',
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: orderReportsBy(sortBy, sortDir),
      offset,
      distinct: true,
    },
    {
      subQuery: false,
    },
  );

  console.log('\n\n\n\n\n\nIn test 3', res);
  return res;
}
