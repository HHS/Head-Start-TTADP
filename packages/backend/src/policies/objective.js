import { find, isUndefined } from 'lodash';
import { OBJECTIVE_STATUS, GOAL_STATUS } from '../constants';
import SCOPES from '../middleware/scopeConstants';

export default class Objective {
  constructor(objective, user) {
    this.user = user;
    this.objective = objective;
  }

  canWriteInRegion(region) {
    const permissions = find(
      this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.READ_WRITE_REPORTS
            && permission.regionId === region),
    );
    return !isUndefined(permissions);
  }

  canUpload() {
    if (this.objective.status !== OBJECTIVE_STATUS.COMPLETE
          && (this.objective.otherEntityId
            || (this.objective.goal
                && this.objective.goal.status !== GOAL_STATUS.CLOSED
                && this.objective.goal.grant
                && this.canWriteInRegion(this.objective.goal.grant.regionId)))) {
      return true;
    }
    return false;
  }

  canUpdate() {
    if (!this.objective.onApprovedAR
        && (this.objective.otherEntityId
          || (this.objective.goal
              && this.objective.goal.grant
              && this.canWriteInRegion(this.objective.goal.grant.regionId)))) {
      return true;
    }
    return false;
  }
}
