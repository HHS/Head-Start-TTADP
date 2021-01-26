import _ from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Users {
  constructor(user) {
    this.user = user;
  }

  canViewUsersInRegion(region) {
    const permissions = this.user.permissions.find(
      (permission) => (
        permission.scopeId === SCOPES.READ_WRITE_REPORTS
        && permission.regionId === region),
    );
    return !_.isUndefined(permissions);
  }
}
