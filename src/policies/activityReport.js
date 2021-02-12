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
import { REPORT_STATUSES } from '../constants';

export default class ActivityReport {
  constructor(user, activityReport) {
    this.user = user;
    this.activityReport = activityReport;
  }

  canReview() {
    return this.isApprovingManager();
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canUpdate() {
    return (this.isAuthor() || this.isCollaborator()) && this.canWriteInRegion();
  }

  canGet() {
    const { status } = this.activityReport;
    const canReadUnapproved = this.isAuthor() || this.isCollaborator() || this.isApprovingManager();

    if (canReadUnapproved) {
      return canReadUnapproved;
    }

    if (status === REPORT_STATUSES.APPROVED) {
      return this.canReadInRegion();
    }

    return false;
  }

  canWriteInRegion() {
    const permissions = _.find(this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.READ_WRITE_REPORTS
        && permission.regionId === this.activityReport.regionId));
    return !_.isUndefined(permissions);
  }

  canReadInRegion() {
    const permissions = _.find(this.user.permissions,
      (permission) => (
        (permission.scopeId === SCOPES.READ_REPORTS
        || permission.scopeId === SCOPES.READ_WRITE_REPORTS)
        && permission.regionId === this.activityReport.regionId));
    return !_.isUndefined(permissions);
  }

  isAuthor() {
    return this.user.id === this.activityReport.userId;
  }

  isCollaborator() {
    return this.activityReport.collaborators.some((user) => user.id === this.user.id);
  }

  isApprovingManager() {
    return this.activityReport.approvingManagerId === this.user.id;
  }
}
