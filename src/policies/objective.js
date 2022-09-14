import { find, isUndefined } from 'lodash';
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

  canUpdate() {
    const regionId = (() => {
      // if the objective is submitted from an activity report,
      // this will necessarily have something in it, since all objectives
      // submitted that way are saved in advance (the reason we check this way is
      // other entities do not have a clear relationship with a region in our data
      // structure)
      if (this.objective.activityReports && this.objective.activityReports.length) {
        return this.objective.activityReports[0].regionId;
      }

      // otherwise, the RTR is only for recipients and thus the objective will have a goal & a grant
      return this.objective.goal.grant.regionId;
    })();

    if (!this.objective.onApprovedAR
        && (this.canWriteInRegion(regionId))) {
      return true;
    }
    return false;
  }
}
