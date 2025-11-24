import _ from 'lodash';
import { SCOPE_IDS } from '@ttahub/common';

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
 * @param {object} user
 * @returns {boolean} - True if the user has READ_WRITE_TRAINING_REPORTS or POC_TRAINING_REPORTS
 */

const hasTrainingReportWritePermissions = (user) => {
  const permissions = _.get(user, 'permissions');
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.READ_WRITE_TRAINING_REPORTS
      || p.scopeId === SCOPE_IDS.POC_TRAINING_REPORTS,
  ) !== undefined;
};

/**
 * Return all regions that user has a minimum of read access to.
 * All permissions that qualify this criteria are:
 * Admin
 * Read Activity Reports
 * Read Write Activity Reports
 * @param {*} - user object
 * @param {includeAdmin} - flag to include/exclude admin permissions
 * @returns {array} - An array of integers, where each integer signifies a region.
 */
export const allRegionsUserHasTrainingReportPermissionTo = (user, includeAdmin = false) => {
  const permissions = _.get(user, 'permissions');

  if (!permissions) return [];

  const minPermissions = [
    SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
    SCOPE_IDS.POC_TRAINING_REPORTS,
  ];

  if (includeAdmin) minPermissions.push(SCOPE_IDS.ADMIN);

  const regions = [];
  permissions.forEach((perm) => {
    if (minPermissions.includes(perm.scopeId)) {
      regions.push(perm.regionId);
    }
  });

  return _.uniq(regions);
};

/**
 * Return all regions that user has a minimum of read access to.
 * All permissions that qualify this criteria are:
 * Admin
 * Read Activity Reports
 * Read Write Activity Reports
 * @param {*} - user object
 * @param {includeAdmin} - flag to include/exclude admin permissions
 * @returns {array} - An array of integers, where each integer signifies a region.
 */
export const allRegionsUserHasActivityReportPermissionTo = (user, includeAdmin = false) => {
  const permissions = _.get(user, 'permissions');

  if (!permissions) return [];

  const minPermissions = [
    SCOPE_IDS.READ_ACTIVITY_REPORTS,
    SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
  ];

  if (includeAdmin) minPermissions.push(SCOPE_IDS.ADMIN);

  const regions = [];
  permissions.forEach((perm) => {
    if (minPermissions.includes(perm.scopeId)) {
      regions.push(perm.regionId);
    }
  });

  return _.uniq(regions);
};

/**
 * Return all regions that user has a minimum of read access to.
 * All permissions that qualify this criteria are:
 * Admin
 * Read Activity Reports
 * Read Write Activity Reports
 * @param {*} - user object
 * @param {includeAdmin} - flag to include/exclude admin permissions
 * @returns {array} - An array of integers, where each integer signifies a region.
 */
export const allRegionsUserHasPermissionTo = (user, includeAdmin = false) => _.uniq([
  ...allRegionsUserHasActivityReportPermissionTo(user, includeAdmin),
  ...allRegionsUserHasTrainingReportPermissionTo(user, includeAdmin),
]);

/**
 * Search the user's permissions the ability to unlock approved reports.
 *
 */
export const canUnlockReports = (user) => _.some(
  user.permissions, (perm) => (perm.scopeId === SCOPE_IDS.UNLOCK_APPROVED_REPORTS
  ),
);

/**
 * Search the user's permissions for any region they have read/write permissions to.
 * Return *first* region that matches this criteria. Otherwise return -1.
 * @param {*} user - user object
 * @returns {number} - region id if the user has read/write access for a region, -1 otherwise
 */

const getRegionWithReadWrite = (user) => {
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
const hasReadWrite = (user) => {
  const { permissions } = user;
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
  ) !== undefined;
};

/**
 * Search the user's permissions for a approve report permission regardless of region
 * @param {*} user - user object
 * @returns {boolean} - True if the user has approve activity report, false otherwise
 */
const hasApproveActivityReport = (user) => {
  const { permissions } = user;
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
  ) !== undefined;
};

/**
 * Search the user's permissions for a approve report permission regardless of region
 * @param {*} user - user object
 * @returns {boolean} - True if the user has approve activity report, false otherwise
 */
const hasApproveActivityReportInRegion = (user, regionId) => {
  const { permissions } = user;
  return permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS
      && p.regionId === regionId,
  ) !== undefined;
};

/**
 * Search the user's permissions for a read/write permisions for a region
 * @param {*} user - user object
 * @param {number} region - region id
 * @returns {boolean} - True if the user has re/write access for a region, false otherwise
 */
const canEditOrCreateGoals = (user, region) => {
  const { permissions } = user;
  return permissions && permissions.find(
    (p) => (
      p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS
      || p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS
    ) && p.regionId === region,
  ) !== undefined;
};

/**
 * Search the user's permissions for a read/write permisions for a region
 * @param {*} user - user object
 * @param {number} region - region id
 * @returns {boolean} - True if the user has re/write access for a region, false otherwise
 */
const canEditOrCreateSessionReports = (user, region) => {
  const { permissions } = user;
  if (isAdmin(user)) {
    return true;
  }

  return permissions && permissions.find(
    (p) => (p.scopeId === SCOPE_IDS.READ_WRITE_TRAINING_REPORTS)
      && p.regionId === region,
  ) !== undefined;
};

/**
 * Check if user can create communication logs in a specific region.
 * Requires READ_WRITE_ACTIVITY_REPORTS (scopeId 3) permission for the region,
 * or ADMIN permission (scopeId 2).
 * @param {object} user - user object
 * @param {number} regionId - region id
 * @returns {boolean} - True if the user can create communication logs in the region
 */
const canCreateCommunicationLog = (user, regionId) => {
  if (!user || !regionId) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  const { permissions } = user;
  return !!(permissions && permissions.find(
    (p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS
      && p.regionId === regionId,
  ));
};

/**
 *
 * // probably makes sense to seperate this logic
 * @param {object} user user object
 * @param {number} appliedRegion
 * @param {function} updateAppliedRegion
 * @returns
 */
const getUserRegions = (user) => allRegionsUserHasPermissionTo(user);

const canChangeGoalStatus = (user, region) => canEditOrCreateGoals(user, region);
const canChangeObjectiveStatus = (user, region) => canChangeGoalStatus(user, region);

/**
 * can see behind feature flag
 * @param {object} user
 * @param {string} flag
 */

const canSeeBehindFeatureFlag = (user, flag) => {
  if (!user || !user.flags) {
    return false;
  }

  const { flags } = user;
  return flags.includes(flag) || isAdmin(user);
};

export {
  isAdmin as default,
  getRegionWithReadWrite,
  hasReadWrite,
  getUserRegions,
  canEditOrCreateGoals,
  canChangeGoalStatus,
  canChangeObjectiveStatus,
  canEditOrCreateSessionReports,
  hasApproveActivityReport,
  hasApproveActivityReportInRegion,
  canSeeBehindFeatureFlag,
  hasTrainingReportWritePermissions,
  canCreateCommunicationLog,
};
