import { Op } from 'sequelize';
import {
  Grant, Grantee, Program, sequelize,
} from '../models';
import orderGranteesBy from '../lib/orderGranteesBy';
import { GRANTEES_PER_PAGE } from '../constants';

export async function allGrantees() {
  return Grantee.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

export async function granteeById(granteeId, grantScopes) {
  return Grantee.findOne({
    attributes: ['id', 'name', 'granteeType'],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'grantSpecialistName', 'granteeId'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [
            grantScopes,
          ],
        },
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
      [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'], [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
    ],
  });
}

/**
 *
 * @param {string} query
 * @param {number} regionId
 * @param {string} sortBy
 *
 * @returns {Promise} grantee results
 */
export async function granteesByName(query, scopes, sortBy, direction, offset) {
  // fix the query
  const q = `%${query}%`;
  const limit = GRANTEES_PER_PAGE;

  const rows = await Grantee.findAll({
    attributes: [
      [sequelize.literal('DISTINCT COUNT(*) OVER()'), 'count'],
      sequelize.literal('STRING_AGG(DISTINCT "grants"."programSpecialistName", \', \' order by "grants"."programSpecialistName") as "programSpecialists"'),
      sequelize.literal('STRING_AGG(DISTINCT "grants"."grantSpecialistName", \', \' order by "grants"."grantSpecialistName") as "grantSpecialists"'),
      [sequelize.col('grants.regionId'), 'regionId'],
      'id',
      'name',
      'granteeType',
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
                  [Op.gte]: '2020-09-01',
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
      'Grantee.id',
    ],
    limit,
    offset,
    order: orderGranteesBy(sortBy, direction),
  });

  // handle zero results
  const firstRow = rows[0];
  const count = firstRow ? firstRow.count : 0;

  return {
    count: parseInt(count, 10),
    rows,
  };
}
