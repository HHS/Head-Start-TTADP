/* eslint-disable max-len */
import { v4 as uuidv4 } from 'uuid';
import { Op, QueryTypes } from 'sequelize';
import { DECIMAL_BASE } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import { formatNumber } from '../widgets/helpers';
import {
  User,
  Permission,
  Role,
  sequelize,
  UserValidationStatus,
  EventReportPilot,
  NationalCenter,
} from '../models';

const { SITE_ACCESS } = SCOPES;

export const userAttributes = [
  'id',
  'name',
  'hsesUserId',
  'hsesUsername',
  'hsesAuthorities',
  'email',
  'phoneNumber',
  'homeRegionId',
  'lastLogin',
  'flags',
  'createdAt',
  'fullName',
];

export async function usersByRoles(roles = [], regionId = null) {
  return User.findAll({
    where: {
      ...(regionId ? {
        homeRegionId: regionId,
      } : {}),
    },
    attributes: [
      'id',
      'name',
      'fullName',
      'email',
      'homeRegionId',
    ],
    include: [
      {
        attributes: [
          'id',
          'name',
          'fullName',
        ],
        model: Role,
        as: 'roles',
        required: true,
        where: {
          name: roles,
        },
      },
      {
        model: Permission,
        as: 'permissions',
        attributes: ['scopeId'],
        where: {
          scopeId: SCOPES.SITE_ACCESS,
        },
        required: true,
      },
    ],
    order: [
      [sequelize.fn('CONCAT', sequelize.col('User."name"'), sequelize.col('User."email"')), 'ASC'],
    ],
  });
}

export async function userById(userId, onlyActiveUsers = false) {
  let permissionInclude = {
    model: Permission,
    as: 'permissions',
    attributes: ['userId', 'scopeId', 'regionId'],
  };

  if (onlyActiveUsers) {
    permissionInclude = {
      ...permissionInclude,
      where: { scopeId: SITE_ACCESS },
    };
  }
  return User.findOne({
    attributes: userAttributes,
    where: {
      id: {
        [Op.eq]: userId,
      },
    },
    include: [
      {
        ...permissionInclude,
      },
      { model: Role, as: 'roles' },
      { model: UserValidationStatus, as: 'validationStatus', attributes: ['userId', 'type', 'validatedAt'] },
    ],
    order: [
      [{ model: Permission, as: 'permissions' }, 'regionId', 'ASC'],
      [sequelize.fn('CONCAT', sequelize.col('User."name"'), sequelize.col('User."email"')), 'ASC'],
    ],
  });
}

export async function userByEmail(email) {
  return User.findOne({
    attributes: ['id'],
    where: {
      email: { [Op.iLike]: email },
    },
  });
}

export async function usersWithPermissions(regions, scopes) {
  return User.findAll({
    attributes: ['id', 'name'],
    where: {
      [Op.and]: [
        { '$permissions.scopeId$': scopes },
        { '$permissions.regionId$': regions },
      ],
    },
    include: [
      { model: Permission, as: 'permissions', attributes: [] },
      { model: Role, as: 'roles' },
    ],
  });
}

/**
 * @param {User} user
 */
export async function userEmailIsVerified(user) {
  if (!user || !user.validationStatus || !user.validationStatus.length) return false;
  return user.validationStatus.some((status) => status.type === 'email' && status.validatedAt);
}

/**
 * @param {number} userId
 */
export async function userEmailIsVerifiedByUserId(userId) {
  const user = await userById(userId);
  return user
    ? userEmailIsVerified(user)
    : false;
}

/**
 * Sets a give feature flag on or off for a set of active users
 *
 * @param {flag:string} flag to set
 * @param {on:boolean} on specifies whether to set the flag on or off
 * @returns {Promise<Array>} result as a promise resolving to an array of empty array and the number of records affected
 */
export async function setFlag(flag, on = true) {
  const query = `
    UPDATE
    "Users" u
    SET
      flags = CASE
        WHEN ${!!on} THEN CASE
            WHEN flags @> ARRAY ['${flag}'::"enum_Users_flags"] THEN flags
            ELSE array_append(flags, '${flag}')
        END
        ELSE array_remove(flags, '${flag}')
      END
    FROM
    "Permissions" p
    WHERE
      p."userId" = u.id AND
      p."scopeId" = ${SITE_ACCESS}
      AND CASE
        WHEN ${!!on} THEN NOT flags @> ARRAY ['${flag}'::"enum_Users_flags"]
        ELSE flags @> ARRAY ['${flag}'::"enum_Users_flags"]
    END;
  `;

  const result = sequelize.query(query, { type: QueryTypes.UPDATE });
  return result;
}

/**
 * @param {number} regionId region to get users for
 * @returns {Promise<Array>} result as a promise resolving to an array of users
 */

export async function getTrainingReportUsersByRegion(regionId, eventId) {
  // this is weird (poc = collaborators, collaborators = read/write)? but it is the case
  // as far as I understand it
  const pointOfContactScope = SCOPES.POC_TRAINING_REPORTS; // regional poc collab
  const collaboratorScope = SCOPES.READ_WRITE_TRAINING_REPORTS; // ist collab

  const users = await User.findAll({
    exclude: [
      'email',
      'phoneNumber',
      'hsesUserId',
      'lastLogin',
      'hsesAuthorities',
      'hsesUsername',
    ],
    where: {
      [Op.or]: {
        '$permissions.scopeId$': {
          [Op.in]: [
            pointOfContactScope,
            collaboratorScope,
          ],
        },
      },
    },
    include: [
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'fullName'],
      },
      {
        attributes: [
          'id',
          'scopeId',
          'regionId',
          'userId',
        ],
        model: Permission,
        as: 'permissions',
        required: true,
        where: {
          regionId,
        },
      },
    ],
    order: [
      ['name', 'ASC'],
      ['email', 'ASC'],
    ],
  });

  const results = {
    pointOfContact: [],
    collaborators: [],
    creators: [],
  };

  users.forEach((user) => {
    if (user.permissions.some((permission) => permission.scopeId === pointOfContactScope)) {
      results.pointOfContact.push(user);
    }
    if (user.permissions.some((permission) => permission.scopeId === collaboratorScope)) {
      results.collaborators.push(user);
    }
  });

  // Copy collaborators to creators.
  results.creators = [...results.collaborators];

  if (eventId) {
    // get event report pilot that has the id event id.
    const eventReportPilot = await EventReportPilot.findOne({
      attributes: ['id', 'ownerId', 'data'],
      where: {
        data: {
          eventId: {
            [Op.endsWith]: `-${eventId}`,
          },
        },
      },
    });

    if (eventReportPilot) {
      // Check if creators contains the current ownerId.
      const currentOwner = results.creators.find((creator) => creator.id === eventReportPilot.ownerId);
      if (!currentOwner) {
        // If the current ownerId is not in the creators array, add it.
        const owner = await userById(eventReportPilot.ownerId);
        results.creators.push({ id: owner.id, fullName: owner.fullName });
      }
    }
  }

  return results;
}

export async function getUserNamesByIds(ids) {
  const users = await User.findAll({
    attributes: ['id', 'name', 'fullName'],
    include: [
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'fullName'],
      },
    ],
    where: {
      id: ids,
    },
  });

  return users.map((u) => u.fullName);
}

export async function findAllUsersWithScope(scope) {
  if (!Object.values(SCOPES).includes(scope)) {
    return [];
  }
  return User.findAll({
    attributes: ['id', 'name'],
    include: [{
      attributes: [],
      model: Permission,
      as: 'permissions',
      where: { scopeId: scope },
    }],
  });
}
