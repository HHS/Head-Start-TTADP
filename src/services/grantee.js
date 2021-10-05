import { Op } from 'sequelize';
import {
  Grant, Grantee, ActivityReport, ActivityRecipient,
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

export async function granteeByScopes(granteeId, grantScopes) {
  const grantee = await Grantee.findOne({
    attributes: ['id', 'name'],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id'],
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

  if (grantee.grants.length < 1) {
    return {
      name: grantee.name,
      grants: [],
    };
  }

  const grantIds = [...new Set(grantee.grants.map((grant) => grant.id))];

  const recipients = await ActivityRecipient.findAll({
    attributes: ['grantId'],
    include: [
      {
        model: Grant,
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        as: 'grant',
        where: {
          id: grantIds,
        },
      },
      {
        model: ActivityReport,
        attributes: ['programTypes'],
        as: 'ActivityReport',
      },
    ],
  });

  const grants = new Map();
  recipients.forEach((recipient) => {
    if (grants.has(recipient.grantId)) {
      const grant = grants.get(recipient.grantId);
      const programTypes = Array.from(
        new Set(
          [...recipient.ActivityReport.programTypes, ...grant.programTypes],
        ),
      );
      grants.set(recipient.grantId, { ...grant, programTypes });
    } else {
      const {
        id,
        number,
        regionId,
        status,
        startDate,
        endDate,
        programSpecialistName,
      } = recipient.grant;

      const grant = {
        id,
        number,
        regionId,
        status,
        startDate,
        endDate,
        programSpecialistName,
        programTypes: recipient.ActivityReport.programTypes,
      };

      grants.set(recipient.grantId, grant);
    }
  });

  return {
    name: grantee.name,
    grants: Array.from(grants.values()),
  };
}

/**
 *
 * @param {string} query
 * @param {number} regionId
 * @param {string} sortBy
 *
 * @returns {Promise} grantee results
 */
export async function granteesByNameAndRegion(query, regionId, sortBy, direction, offset) {
  // fix the query
  const q = `%${query}%`;

  // first get all grants with numbers that match the query string
  const matchingGrantNumbers = await Grant.findAll({
    where: {
      number: {
        [Op.iLike]: q, // sequelize automatically escapes this
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
          regionId,
        },
      },
    ],
    limit,
    offset,
    order: orderGranteesBy(sortBy, direction),
  });
}
