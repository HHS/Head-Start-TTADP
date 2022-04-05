import _ from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Goal {
  constructor(user, goal) {
    this.user = user;
    this.goal = goal;
  }

  canEdit() {
    return this.canWriteInRegion();
  }

  canDelete() {
    return this.canWriteInRegion();
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canWriteInRegion() {
    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        (
          permission.scopeId === SCOPES.READ_WRITE_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS
        )
        && permission.regionId === this.goal.regionId),
    );
    return !_.isUndefined(permissions);
  }
}
