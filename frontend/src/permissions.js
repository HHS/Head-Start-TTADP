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
 * Return all regions that user has a minimum of read access to.
 * All permissions that qualify this criteria are:
 * Admin
 * Read Activity Reports
 * Read Write Activity Reports
 * @param {*} - user object
 * @returns {array} - An array of integers, where each integer signifies a region.
 */
// FIXME: Descide if we will keep this or remove
export const allRegionsUserHasPermissionTo = (user) => {
  const permissions = _.get(user, 'permissions');

  if (!permissions) return [];

  const minPermissions = [
    SCOPE_IDS.ADMIN,
    SCOPE_IDS.READ_ACTIVITY_REPORTS,
    SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
  ];

  const regions = [];
  permissions.forEach((perm) => {
    if (minPermissions.includes(perm.scopeId)) {
      regions.push(perm.regionId);
    }
  });

  return _.uniq(regions);
};

/**
 * Search the user's permissions for any region they have read/write permissions to.
 * Return *first* region that matches this criteria. Otherwise return -1.
 * @param {*} user - user object
 * @returns {number} - region id if the user has read/write access for a region, -1 otherwise
 */

export const getRegionWithReadWrite = (user) => {
  const { permissions } = user;
  if (!permissions) return -1;

  const perm = permissions.find((p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS);
  return perm ? perm.regionId : -1;
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
