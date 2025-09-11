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
  const { hsesUsername, hsesUserId } = data;

  if (!hsesUsername) {
    const msg = 'findOrCreateUser: missing hsesUsername';
    auditLogger.error(msg);
    return Promise.reject(new Error(msg));
  }

  const createOrUpdateByUsername = () => User.findOrCreate({
    where: { hsesUsername },
    defaults: { lastLogin: sequelize.fn('NOW'), ...data },
  }).then(([user, created]) => {
    if (created) {
      auditLogger.info(`Created user ${user.id} with no access permissions`);
      return user;
    }
    // row already exists — update it
    auditLogger.info(`Updating user ${user.id} found by hsesUsername`);
    return user.update({ ...data, lastLogin: sequelize.fn('NOW') });
  });

  return User.findOne({ where: { hsesUsername } })
    .then((userByUsername) => {
      if (userByUsername) {
        // primary path: update existing user found by username
        return userByUsername.update({
          hsesUsername,
          hsesAuthorities: data.hsesAuthorities,
          hsesUserId: hsesUserId || userByUsername.hsesUserId,
          email: data.email ?? userByUsername.email,
          name: data.name ?? userByUsername.name,
          lastLogin: sequelize.fn('NOW'),
        });
      }

      // fallback: try legacy id
      if (hsesUserId) {
        return User.findOne({ where: { hsesUserId } }).then(
          (userByLegacyId) => {
            if (userByLegacyId) {
              auditLogger.warn(
                `Backfilled user ${userByLegacyId.id} by legacy hsesUserId; setting hsesUsername=${hsesUsername}`,
              );
              return userByLegacyId.update({
                hsesUsername,
                hsesAuthorities: data.hsesAuthorities,
                hsesUserId: hsesUserId || userByLegacyId.hsesUserId,
                email: data.email ?? userByLegacyId.email,
                name: data.name ?? userByLegacyId.name,
                lastLogin: sequelize.fn('NOW'),
              });
            }
            // not found by legacy id either — create by username
            return createOrUpdateByUsername();
          },
        );
      }

      // no legacy id — create by username
      return createOrUpdateByUsername();
    })
    .catch((error) => {
      const msg = `Error finding or creating user in database - ${error}`;
      auditLogger.error(`SERVICE:FIND_OR_CREATE_USER - ${msg}`);
      throw new Error(msg);
    });
}
