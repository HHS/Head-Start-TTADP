import _ from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Users {
  constructor(user) {
    this.user = user;
  }

  /**
   * borrowed this from the ActivityReports policy because it seems to make a lot of
   * sense for it to live in here
   * @returns {bool}, whether the user is an admin
   */
  isAdmin() {
    const adminScope = this.user.permissions.find(
      (permission) => permission.scopeId === SCOPES.ADMIN,
    );
    return !_.isUndefined(adminScope);
  }

  /**
   * if the user is an admin or the user has specific permissions to
   * view a feature flag, this will return true
   * @param {string} flag the name of the feature flag
   * @returns {bool} whether the user can view the feature flag
   */
  canSeeBehindFeatureFlag(flag) {
    return this.isAdmin() || this.user.flags.find((f) => f === flag);
  }

  canViewUsersInRegion(region) {
    const permissions = this.user.permissions.find(
      (permission) => (
        (permission.scopeId === SCOPES.READ_WRITE_REPORTS
          || permission.scopeId === SCOPES.READ_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS)
        && permission.regionId === region),
    );
    return !_.isUndefined(permissions);
  }
}
