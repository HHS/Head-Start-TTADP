import { User, sequelize } from '../models';
import { auditLogger } from '../logger';

/**
 * Finds or creates a user in the database.
 *
 * //potentially use also or instead of the user id provided by HSES
 * @param {Object} userData - user information containing email address, hses user id
 * @returns {Promise<any>} - returns a promise
 */
export default function findOrCreateUser(data) {
  return User.findOne({
    where: {
      hsesUserId: data.hsesUserId,
    },
  }).then((userFoundByHsesUserId) => {
    if (!userFoundByHsesUserId) {
      return User.findOrCreate({
        where: {
          hsesUsername: data.hsesUsername,
          lastLogin: new Date(),
        },
        defaults: data,
      }).then(([user, created]) => {
        if (created) {
          auditLogger.info(`Created user ${user.id} with no access permissions`);
          return user;
        }
        auditLogger.warn(`Updating user ${user.id} found by hsesUserName`);
        return user.update({
          hsesUsername: data.hsesUsername,
          hsesAuthorities: data.hsesAuthorities,
          hsesUserId: data.hsesUserId,
          lastLogin: sequelize.fn('NOW'),
        });
      });
    }
    return userFoundByHsesUserId.update({
      hsesUsername: data.hsesUsername,
      hsesAuthorities: data.hsesAuthorities,
      hsesUserId: data.hsesUserId,
      lastLogin: sequelize.fn('NOW'),
    });
  }).catch((error) => {
    const msg = `Error finding or creating user in database - ${error}`;
    auditLogger.error(`SERVICE:FIND_OR_CREATE_USER - ${msg}`);
    throw new Error(msg);
  });
}
