import _ from 'lodash';
import { SCOPE_IDS } from './Constants';

/**
 * Search the user's permissions for an ADMIN scope
 * @param {*} - user object
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
const isAdmin = (user) => {
  const permissions = _.get(user, 'permissions');
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.ADMIN,
  ) !== undefined;
};

/**
 * Search the user's permissions for a read/write permisions for a region
 * @param {*} user - user object
 * @returns {boolean} - True if the user has re/write access for a region, false otherwise
 */
export const hasReadWrite = (user) => {
  const { permissions } = user;
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
  ) !== undefined;
};

export default isAdmin;
