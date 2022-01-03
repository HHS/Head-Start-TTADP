import { Op } from 'sequelize';
import { Permission } from '../models';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import { DECIMAL_BASE } from '../constants';
import { userById } from './users';

const { SITE_ACCESS, ADMIN } = SCOPES;

const namespace = 'SERVICE:ACCESS_VALIDATION';

const logContext = {
  namespace,
};

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

/**
 *
 * @param {Number} userId
 * @returns boolean whether the user is from the central office or not
 */
export async function isCentralOffice(userId) {
  const user = await userById(userId);
  return user.homeRegionId === 14;
}

/*
  Make sure the user has read permissions to the regions requested. If no regions
  are explicitly requested default to all regions which the user has access to.
*/
export async function setReadRegions(query, userId) {
  const readRegions = await getUserReadRegions(userId);

  // if region.in is part of query (user has requested specific regions)
  if ('region.in' in query && Array.isArray(query['region.in']) && query['region.in'][0]) {
    return {
      ...query,
      'region.in': query['region.in'].filter((r) => readRegions.includes(parseInt(r, DECIMAL_BASE))),
    };
  }

  // otherwise region.in is not in query and we return all read regions
  return {
    ...query,
    'region.in': readRegions,
  };
}
