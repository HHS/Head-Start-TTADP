/* eslint-disable max-len */

import { DECIMAL_BASE, MUTUALLY_EXCLUSIVE_SCOPES } from '@ttahub/common';
import { Op, QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import SCOPES from '../middleware/scopeConstants';
import {
  EventReportPilot,
  Permission,
  Role,
  sequelize,
  User,
  UserValidationStatus,
} from '../models';
import { formatNumber } from '../widgets/helpers';

const { SITE_ACCESS } = SCOPES;

// the admin page's stand-in for every region, which is never saved as a permission
const ALL_REGIONS = 15;

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
      ...(regionId
        ? {
            homeRegionId: regionId,
          }
        : {}),
    },
    attributes: ['id', 'name', 'fullName', 'email', 'homeRegionId'],
    include: [
      {
        attributes: ['id', 'name', 'fullName'],
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
      {
        model: UserValidationStatus,
        as: 'validationStatus',
        attributes: ['userId', 'type', 'validatedAt'],
      },
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
      [Op.and]: [{ '$permissions.scopeId$': scopes }, { '$permissions.regionId$': regions }],
    },
    include: [
      { model: Permission, as: 'permissions', attributes: [] },
      { model: Role, as: 'roles' },
    ],
  });
}

/**
 * Active users (those with site access) who hold at least one of the scopes in the region,
 * once each, ordered by name
 *
 * @param {number[]} scopeIds
 * @param {number} regionId
 */
export async function activeUsersWithScopesInRegion(scopeIds, regionId) {
  return User.findAll({
    attributes: ['id', 'name'],
    where: {
      // site access is a second permission row, which the permissions include below can't
      // also require
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT "userId" FROM "Permissions" WHERE "scopeId" = ${SITE_ACCESS})`
        ),
      },
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: [],
        where: { scopeId: scopeIds, regionId },
        required: true,
      },
    ],
    order: [['name', 'ASC']],
  });
}

/**
 * The regions where the permissions hold both scopes of a mutually exclusive pair
 *
 * @param {{ scopeId: number, regionId: number }[]} permissions
 * @returns {number[]}
 */
export function regionsWithExclusiveScopeConflicts(permissions = []) {
  const regionPermissions = permissions.filter((p) => p.regionId !== ALL_REGIONS);
  const regions = new Set();

  MUTUALLY_EXCLUSIVE_SCOPES.forEach(([first, second]) => {
    regionPermissions
      .filter((p) => p.scopeId === first)
      .forEach(({ regionId }) => {
        if (regionPermissions.some((p) => p.scopeId === second && p.regionId === regionId)) {
          regions.add(regionId);
        }
      });
  });

  return [...regions];
}

/** the message shown when a region already has its one primary TTA request approver */
export const primaryApproverMessage = (regionId, name) =>
  `Region ${regionId} already has a primary COR approver: ${name}`;

/**
 * Each region has one primary TTA request approver (APPROVE_TTA_REQUESTS), though any number
 * of backup approvers. Returns a message for each region the permissions would make the user
 * a second primary approver in.
 *
 * @param {number|string} userId - the user being updated
 * @param {{ scopeId: number, regionId: number }[]} permissions
 * @returns {Promise<string[]>}
 */
export async function primaryApproverConflicts(userId, permissions = []) {
  const regionIds = permissions
    .filter((p) => p.scopeId === SCOPES.APPROVE_TTA_REQUESTS && p.regionId !== ALL_REGIONS)
    .map((p) => p.regionId);

  if (!regionIds.length) {
    return [];
  }

  const existing = await Permission.findAll({
    attributes: ['regionId'],
    where: {
      scopeId: SCOPES.APPROVE_TTA_REQUESTS,
      regionId: regionIds,
      userId: { [Op.ne]: userId },
    },
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    order: [['regionId', 'ASC']],
  });

  return existing.map(({ regionId, user }) => primaryApproverMessage(regionId, user.name));
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
  return user ? userEmailIsVerified(user) : false;
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
    exclude: ['email', 'phoneNumber', 'hsesUserId', 'lastLogin', 'hsesAuthorities', 'hsesUsername'],
    where: {
      [Op.or]: {
        '$permissions.scopeId$': {
          [Op.in]: [pointOfContactScope, collaboratorScope],
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
        attributes: ['id', 'scopeId', 'regionId', 'userId'],
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
    // get event report pilot that has the matching full event display id.
    const eventReportPilot = await EventReportPilot.findOne({
      attributes: ['id', 'ownerId', 'data'],
      where: {
        data: {
          eventId: {
            [Op.eq]: eventId,
          },
        },
      },
    });

    if (eventReportPilot) {
      // Check if creators contains the current ownerId.
      const currentOwner = results.creators.find(
        (creator) => creator.id === eventReportPilot.ownerId
      );
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
    include: [
      {
        attributes: [],
        model: Permission,
        as: 'permissions',
        where: { scopeId: scope },
      },
    ],
  });
}
