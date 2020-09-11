import { User, sequelize } from '../models';
import logger from '../logger';

const namespace = 'SERVICE:ACCESS_VALIDATION';

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
