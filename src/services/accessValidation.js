import { User, Permission, sequelize } from '../models';
import { auditLogger as logger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

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
  return sequelize.transaction((transaction) => User.findOrCreate({
    where: {
      hsesUserId: data.hsesUserId,
    },
    defaults: data,
    transaction,
  }).then(([user, created]) => {
    if (created) {
      logger.info(`Created user ${user.id} with no access permissions`);
    }
    return user;
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
    return userPermission !== null;
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - ADMIN Access error - ${error}`);
    throw error;
  }
}
