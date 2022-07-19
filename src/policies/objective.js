import { find, isUndefined } from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Objective {
  constructor(objective) {
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

  canUpdate() {
    if (!this.objective.onApprovedAR
        && (this.canWriteInRegion(this.objective.goal.grant.regionId)
            || this.objective.otherEntityId)) {
      return true;
    }
    return false;
  }
}
