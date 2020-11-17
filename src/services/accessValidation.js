import { User, Permission, sequelize } from '../models';
import logger from '../logger';
import SCOPES from '../middleware/scopeConstants';

const { ADMIN } = SCOPES;

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
      ...data,
    },
    transaction,
  }) // findOrCreate API returns 2 values (instance, created). We only need to return the first.
    .then((result) => result[0])
    .catch(() => {
      logger.error(`${namespace} - Error finding or creating User in database.`);
      throw new Error('Error finding or creating user in database');
    }));
}

export async function validateUserAuthForAdmin(req) {
  let result = false;
  const { userId } = req.session;
  const { role } = req.session;
  let userPermissions;
  try {
    if (role && role === 'admin') {
      result = true;
    } else {
      userPermissions = await Permission.findAll({
        attributes: ['scopeId'],
        where: { userId },
      });
      result = userPermissions.some((permission) => (permission.scopeId === ADMIN));
    }
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Access error - ${error}`);
    throw error;
  }
  return result;
}
