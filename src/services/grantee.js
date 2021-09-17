import { Op } from 'sequelize';
import { Grant, Grantee } from '../models';

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
export async function granteesByNameAndRegion(query, regionId) {
  const matchingGrantNumbers = await Grant.findAll({
    where: {
      number: {
        [Op.iLike]: `%${query}%`, // sequelize automatically escapes this
      },
      regionId,
    },
    include: [
      {
        model: Grantee,
        as: 'grantee',
      },
    ],
  });

  let granteeWhere = {
    name: {
      [Op.iLike]: `%${query}%`, // sequelize automatically escapes this
    },
  };

  console.log(matchingGrantNumbers);

  if (matchingGrantNumbers) {
    const matchingGrantNumbersGranteeIds = matchingGrantNumbers.map((grant) => grant.grantee.id);
    granteeWhere = {
      [Op.or]: [
        {
          name: {
            [Op.iLike]: `%${query}%`, // sequelize automatically escapes this
          },
        },
        {
          id: matchingGrantNumbersGranteeIds,
        },
      ],
    };
  }

  return Grantee.findAll({
    where: granteeWhere,
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
        where: {
          regionId,
        },
      },
    ],
  });
}
