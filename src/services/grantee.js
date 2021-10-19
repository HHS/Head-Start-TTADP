import { Op } from 'sequelize';
import {
  Grant, Grantee, Program,
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
  const grantee = await Grantee.findOne({
    attributes: ['id', 'name'],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [
            grantScopes,
          ],
        },
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'], [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
    ],
  });

  if (!grantee) {
    return null;
  }

  const grantIds = grantee.grants.map((grant) => grant.id);

  const programs = await Program.findAll({
    attributes: ['name'],
    include: [
      {
        attributes: ['id'],
        model: Grant,
        as: 'grant',
        where: {
          id: grantIds,
        },
      },
    ],
  });

  programs.forEach((program) => {
    const grant = grantee.grants.find((g) => g.id === program.grant.id);

    if (!grant) {
      return;
    }

    if (grant.dataValues.programs) {
      grant.dataValues.programs = [new Set(...grant.dataValues.programs, program.name)];
    } else {
      grant.dataValues.programs = [program.name];
    }
  });

  return grantee;
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

  // first get all grants with numbers that match the query string
  const matchingGrantNumbers = await Grant.findAll({
    where: {
      number: {
        [Op.iLike]: q, // sequelize automatically escapes this
      },
      [Op.and]: scopes,
    },
    include: [
      {
        model: Grantee,
        as: 'grantee',
      },
    ],
  });

  // create a base where clause for the grantees matching the name and the query string
  let granteeWhere = {
    name: {
      [Op.iLike]: q, // sequelize automatically escapes this
    },
  };

  // if we have any matching grant numbers
  if (matchingGrantNumbers) {
    // we pull out the grantee ids
    // and include them in the where clause, so either
    // the grant number or the grant name matches the query string
    const matchingGrantNumbersGranteeIds = matchingGrantNumbers.map((grant) => grant.grantee.id);
    granteeWhere = {
      [Op.or]: [
        {
          name: {
            [Op.iLike]: q, // sequelize automatically escapes this
          },
        },
        {
          id: matchingGrantNumbersGranteeIds,
        },
      ],
    };
  }

  const limit = GRANTEES_PER_PAGE;

  return Grantee.findAndCountAll({
    where: granteeWhere,
    include: [
      {
        attributes: ['id', 'number', 'regionId', 'programSpecialistName'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: scopes,
        },
      },
    ],
    limit,
    offset,
    order: orderGranteesBy(sortBy, direction),
  });
}
