import { Op } from 'sequelize';
import { User, Permission, sequelize } from '../models';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import { DECIMAL_BASE } from '../constants';

const { SITE_ACCESS, ADMIN } = SCOPES;

const namespace = 'SERVICE:ACCESS_VALIDATION';

const logContext = {
  namespace,
};

/**
 * Finds or creates a user in the database.
 *
 * //potentially use also or instead of the user id provided by HSES
 * @param {Object} userData - user information containing email address, hses user id
 * @returns {Promise<any>} - returns a promise
 */
export default function findOrCreateUser(data) {
  return sequelize.transaction((transaction) => User.findOne({
    where: {
      hsesUserId: data.hsesUserId,
    },
    transaction,
  }).then((userFoundByHsesUserId) => {
    if (!userFoundByHsesUserId) {
      return User.findOrCreate({
        where: {
          hsesUsername: data.hsesUsername,
        },
        defaults: data,
        transaction,
      }).then(([user, created]) => {
        if (created) {
          logger.info(`Created user ${user.id} with no access permissions`);
          return user;
        }
        logger.warn(`Updating user ${user.id} found by hsesUserName`);
        return user.update({
          hsesUsername: data.hsesUsername,
          hsesAuthorities: data.hsesAuthorities,
          hsesUserId: data.hsesUserId,
          lastLogin: sequelize.fn('NOW'),
        }, { transaction });
      });
    }
    return userFoundByHsesUserId.update({
      hsesUsername: data.hsesUsername,
      hsesAuthorities: data.hsesAuthorities,
      hsesUserId: data.hsesUserId,
      lastLogin: sequelize.fn('NOW'),
    }, { transaction });
  }).catch((error) => {
    const msg = `Error finding or creating user in database - ${error}`;
    logger.error(`${namespace} - ${msg}`);
    throw new Error(msg);
  }));
}

export async function validateUserAuthForAccess(userId) {
  try {
    const userPermission = await Permission.findOne({
      where: {
        userId,
        scopeId: SITE_ACCESS,
      },
    });
    return userPermission !== null;
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Access error - ${error}`);
    throw error;
  }
}

export async function validateUserAuthForAdmin(userId) {
  try {
    const userPermission = await Permission.findOne({
      where: {
        userId,
        scopeId: ADMIN,
      },
    });
    if (userPermission !== null) {
      logger.info(`User ${userId} successfully checked ADMIN access`);
      return true;
    }
    logger.warn(`User ${userId} unsuccessfully checked ADMIN access`);
    return false;
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - ADMIN Access error - ${error}`);
    throw error;
  }
}

export async function getUserReadRegions(userId) {
  try {
    const readRegions = await Permission.findAll({
      attributes: ['regionId'],
      where: {
        userId,
        [Op.or]: [
          { scopeId: SCOPES.READ_WRITE_REPORTS },
          { scopeId: SCOPES.READ_REPORTS },
          { scopeId: SCOPES.APPROVE_REPORTS },
        ],
      },
    });
    return readRegions ? readRegions.map((p) => p.regionId) : [];
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Read region retrieval error - ${error}`);
    throw error;
  }
}

/*
  Make sure the user has read permissions to the regions requested. If no regions
  are explicitly requested default to all regions which the user has access to.
*/
export async function setReadRegions(query, userId, useFirstReadRegion = false) {
  const readRegions = await getUserReadRegions(userId);
  if ('region.in' in query && Array.isArray(query['region.in']) && query['region.in'][0]) {
    return {
      ...query,
      'region.in': query['region.in'].filter((r) => readRegions.includes(parseInt(r, DECIMAL_BASE))),
    };
  }

  return {
    ...query,
    'region.in': useFirstReadRegion ? [readRegions[0]] : readRegions,
  };
}
