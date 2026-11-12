import { SCOPE_IDS, TTA_REQUEST_STATUSES } from '@ttahub/common';
import _ from 'lodash';

/**
 * Search the user's permissions for an ADMIN scope
 * @param {*} - user object
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
const isAdmin = (user) => {
  const permissions = _.get(user, 'permissions');
  return permissions && permissions.find((p) => p.scopeId === SCOPE_IDS.ADMIN) !== undefined;
};

/**
 * @param {object} user
 * @returns {boolean} - True if the user has READ_WRITE_TRAINING_REPORTS or POC_TRAINING_REPORTS
 */

const hasTrainingReportWritePermissions = (user) => {
  const permissions = _.get(user, 'permissions');
  return (
    permissions &&
    permissions.find(
      (p) =>
        p.scopeId === SCOPE_IDS.READ_WRITE_TRAINING_REPORTS ||
        p.scopeId === SCOPE_IDS.POC_TRAINING_REPORTS ||
        p.scopeId === SCOPE_IDS.ADMIN
    ) !== undefined
  );
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

  const minPermissions = [SCOPE_IDS.READ_WRITE_TRAINING_REPORTS, SCOPE_IDS.POC_TRAINING_REPORTS];

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

  const minPermissions = [SCOPE_IDS.READ_ACTIVITY_REPORTS, SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS];

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
export const allRegionsUserHasPermissionTo = (user, includeAdmin = false) =>
  _.uniq([
    ...allRegionsUserHasActivityReportPermissionTo(user, includeAdmin),
    ...allRegionsUserHasTrainingReportPermissionTo(user, includeAdmin),
  ]);

export const allRegionsUserHasTtaRequestPermissionTo = (user) => {
  const permissions = _.get(user, 'permissions');

  if (!permissions) return [];

  const readScopes = [
    SCOPE_IDS.READ_REPORTS,
    SCOPE_IDS.READ_WRITE_TTA_REQUESTS,
    SCOPE_IDS.REVIEW_TTA_REQUESTS,
    SCOPE_IDS.APPROVE_TTA_REQUESTS,
    SCOPE_IDS.BACKUP_APPROVE_TTA_REQUESTS,
  ];

  return _.uniq(
    permissions
      .filter((permission) => readScopes.includes(permission.scopeId))
      .map((permission) => permission.regionId)
  );
};

/**
 * Search the user's permissions the ability to unlock approved reports.
 *
 */
export const canUnlockReports = (user) =>
  _.some(user.permissions, (perm) => perm.scopeId === SCOPE_IDS.UNLOCK_APPROVED_REPORTS);

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
  return (
    permissions &&
    permissions.find((p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS) !== undefined
  );
};

/**
 * Search the user's permissions for a approve report permission regardless of region
 * @param {*} user - user object
 * @returns {boolean} - True if the user has approve activity report, false otherwise
 */
const hasApproveActivityReport = (user) => {
  const { permissions } = user;
  return (
    permissions &&
    permissions.find((p) => p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS) !== undefined
  );
};

/**
 * Search the user's permissions for a approve report permission regardless of region
 * @param {*} user - user object
 * @returns {boolean} - True if the user has approve activity report, false otherwise
 */
const hasApproveActivityReportInRegion = (user, regionId) => {
  const { permissions } = user;
  return (
    permissions &&
    permissions.find(
      (p) => p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS && p.regionId === regionId
    ) !== undefined
  );
};

/**
 * Search the user's permissions for a read/write permisions for a region
 * @param {*} user - user object
 * @param {number} region - region id
 * @returns {boolean} - True if the user has re/write access for a region, false otherwise
 */
const canEditOrCreateGoals = (user, region) => {
  const { permissions } = user;
  return (
    permissions &&
    permissions.find(
      (p) =>
        (p.scopeId === SCOPE_IDS.APPROVE_ACTIVITY_REPORTS ||
          p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS) &&
        p.regionId === region
    ) !== undefined
  );
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

  return (
    permissions &&
    permissions.find(
      (p) => p.scopeId === SCOPE_IDS.READ_WRITE_TRAINING_REPORTS && p.regionId === region
    ) !== undefined
  );
};

/**
 * Check if user can create communication logs in a specific region.
 * Requires READ_WRITE_ACTIVITY_REPORTS (scopeId 3) permission for the region.
 * Region 14 is excluded as it is not an actual region.
 * @param {object} user - user object
 * @param {number} regionId - region id
 * @returns {boolean} - True if the user can create communication logs in the region
 */
const canCreateCommunicationLog = (user, regionId) => {
  if (!user || !regionId || regionId === 14) {
    return false;
  }

  const { permissions } = user;
  return !!(
    permissions &&
    permissions.find(
      (p) => p.scopeId === SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS && p.regionId === regionId
    )
  );
};

/**
 * Search the user's permissions for TTA request read/write in any region, which is what
 * lets them start a request on the all regions page
 * @param {object} user - user object
 * @returns {boolean} - True if the user can create TTA requests in some region
 */
const hasTtaRequestReadWrite = (user) => {
  const { permissions } = user;
  return !!permissions && permissions.some((p) => p.scopeId === SCOPE_IDS.READ_WRITE_TTA_REQUESTS);
};

/**
 * Check if user can create TTA requests in a specific region.
 * Requires READ_WRITE_TTA_REQUESTS permission for the region.
 * Region 14 is excluded as it is not an actual region.
 * @param {object} user - user object
 * @param {number} regionId - region id
 * @returns {boolean} - True if the user can create TTA requests in the region
 */
const canCreateTtaRequest = (user, regionId) => {
  if (!user || !regionId || regionId === 14) {
    return false;
  }

  const { permissions } = user;
  return !!(
    permissions &&
    permissions.find(
      (p) => p.scopeId === SCOPE_IDS.READ_WRITE_TTA_REQUESTS && p.regionId === regionId
    )
  );
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

/**
 * Check if user can change a submitted TTA request's details as its reviewer, as the API's TTA
 * request policy allows: while it is submitted to them and they can still review in its region
 * @param {object} user - user object
 * @param {object} ttaRequest - the saved request, with its reviewer, status and region
 * @returns {boolean} - True if the user can edit the request as its reviewer
 */
const canReviewerEditTtaRequest = (user, ttaRequest) => {
  if (!user || !ttaRequest) {
    return false;
  }

  const { permissions } = user;
  return (
    ttaRequest.reviewer?.id === user.id &&
    ttaRequest.status === TTA_REQUEST_STATUSES.SUBMITTED &&
    !!permissions &&
    permissions.some(
      (p) => p.scopeId === SCOPE_IDS.REVIEW_TTA_REQUESTS && p.regionId === ttaRequest.regionId
    )
  );
};

/**
 * Check if user can edit a saved TTA request, as the API's TTA request policy allows: its
 * creator, while it is a draft or sent back to them for changes, and only while they can still
 * write in its region. An admin can also edit a request sent back for changes. Its reviewer
 * edits a request submitted to them on the review instead (see canReviewerEditTtaRequest).
 * @param {object} user - user object
 * @param {object} ttaRequest - the saved request, with its creator, status and region
 * @returns {boolean} - True if the user can edit the request
 */
const canEditTtaRequest = (user, ttaRequest) => {
  if (!user || !ttaRequest) {
    return false;
  }

  if (isAdmin(user) && ttaRequest.status === TTA_REQUEST_STATUSES.NEEDS_ACTION) {
    return true;
  }

  const editable = [TTA_REQUEST_STATUSES.DRAFT, TTA_REQUEST_STATUSES.NEEDS_ACTION];
  const { permissions } = user;
  return (
    ttaRequest.creator?.id === user.id &&
    editable.includes(ttaRequest.status) &&
    !!permissions &&
    permissions.some(
      (p) => p.scopeId === SCOPE_IDS.READ_WRITE_TTA_REQUESTS && p.regionId === ttaRequest.regionId
    )
  );
};

const canSeeBehindFeatureFlag = (user, flag) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!Array.isArray(user.flags)) return false;
  return user.flags.includes(flag);
};

export {
  canChangeGoalStatus,
  canChangeObjectiveStatus,
  canCreateCommunicationLog,
  canCreateTtaRequest,
  canEditOrCreateGoals,
  canEditTtaRequest,
  canReviewerEditTtaRequest,
  canEditOrCreateSessionReports,
  canSeeBehindFeatureFlag,
  getRegionWithReadWrite,
  getUserRegions,
  hasApproveActivityReport,
  hasApproveActivityReportInRegion,
  hasReadWrite,
  hasTrainingReportWritePermissions,
  hasTtaRequestReadWrite,
  isAdmin as default,
};
