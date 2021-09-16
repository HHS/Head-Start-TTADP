import { Op } from 'sequelize';
import { Grant, Grantee, sequelize } from '../models';

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

/**
 *
 * @param {string} query
 * @param {number} regionId
 * @param {string} sortBy
 *
 * @returns {object[]} grantee results
 */
export async function granteesByNameAndRegion(query) {
  const q = sequelize.escape(query);

  console.log('[query]', q);

  return Grantee.findAll({
    where: {
      // [Op.or]: [
      //  {
      name: {
        [Op.iLike]: q,
      },
      //   },
      //   {
      //     'grants.id': {
      //       [Op.iLike]: q,
      //     },
      //   },
      // ],
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}
