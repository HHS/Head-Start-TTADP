import _ from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class ActivityReport {
  constructor(user, activityReport) {
    this.user = user;
    this.activityReport = activityReport;
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

    if (status === 'approved') {
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
    return this.activityReport.collaborators.includes(this.user.id);
  }

  isApprovingManager() {
    return this.activityReport.approvingManagerId === this.user.id;
  }
}
