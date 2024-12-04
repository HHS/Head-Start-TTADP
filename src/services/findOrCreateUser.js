import { Sequelize } from 'sequelize';
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
        },
        defaults: { lastLogin: sequelize.fn('NOW'), ...data },
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
    // eslint-disable-next-line
    console.log('findOrCreateUser:', userFoundByHsesUserId, data);
    return userFoundByHsesUserId.update({
      hsesUsername: data.hsesUsername,
      hsesAuthorities: data.hsesAuthorities,
      hsesUserId: data.hsesUserId,
      lastLogin: sequelize.fn('NOW'),
    });
  }).catch((error) => {
    const errorDetails = {};

    // Check if the error is a Sequelize error
    if (error.name && error.name.startsWith('Sequelize')) {
      errorDetails.name = error.name || 'Unknown Sequelize Error';
      errorDetails.message = error.message || 'No message available';
      errorDetails.errors = error.errors || [];
      errorDetails.stack = error.stack || 'No stack trace available';
      errorDetails.sql = error.sql || 'No SQL information available';
    } else {
      // Handle other types of errors (e.g., generic JavaScript errors)
      errorDetails.name = error.name || 'Unknown Error';
      errorDetails.message = error.message || 'No message available';
      errorDetails.stack = error.stack || 'No stack trace available';
      errorDetails.errors = [];
      errorDetails.sql = 'Not applicable';
    }

    const detailedMessage = `
      Error finding or creating user in database:
      - Name: ${errorDetails.name}
      - Message: ${errorDetails.message}
      - SQL: ${errorDetails.sql}
      - Stack: ${errorDetails.stack}
      - Errors: ${JSON.stringify(errorDetails.errors, null, 2)}
    `;

    auditLogger.error(`SERVICE:FIND_OR_CREATE_USER - ${detailedMessage}`);
    throw new Error(detailedMessage);
  });
}
