/*
  This class handles authorization for Activity Reports. In express handlers this
  object should be constructed with the current user and the activity report to be
  updated/retrieved for update/get or the new report for create. The permissions
  of the user are checked against the report and simple questions about the actions
  the user can take on that report are answered, mainly can the user create, update
  or get the report.
*/
import _ from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Goal {
  constructor(user, goal) {
    this.user = user;
    this.goal = goal;
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
