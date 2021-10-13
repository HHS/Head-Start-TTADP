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
    // Ability to review is meant to be independent of report status per acceptance criteria
    return this.isApprovingManager() && this.canApproveInRegion();
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canUpdate() {
    return (this.isAuthor() || this.isCollaborator())
      && this.canWriteInRegion()
      && this.reportHasEditableStatus();
  }

  canReset() {
    return (this.isAuthor() || this.isCollaborator())
      && this.activityReport.calculatedStatus === REPORT_STATUSES.SUBMITTED;
  }

  canDelete() {
    return (this.isAdmin() || this.isAuthor())
      && this.activityReport.calculatedStatus !== REPORT_STATUSES.APPROVED;
  }

  canViewLegacy() {
    return this.canReadInRegion();
  }

  canGet() {
    const canReadUnapproved = this.isAuthor() || this.isCollaborator() || this.isApprovingManager();

    if (canReadUnapproved) {
      return canReadUnapproved;
    }

    if (this.activityReport.calculatedStatus === REPORT_STATUSES.APPROVED) {
      return this.canReadInRegion();
    }

    return false;
  }

  canApproveInRegion() {
    const permissions = _.find(this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.APPROVE_REPORTS
        && permission.regionId === this.activityReport.regionId));
    return !_.isUndefined(permissions);
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
          || permission.scopeId === SCOPES.APPROVE_REPORTS
          || permission.scopeId === SCOPES.READ_WRITE_REPORTS)
        && permission.regionId === this.activityReport.regionId));
    return !_.isUndefined(permissions);
  }

  isAdmin() {
    const adminScope = this.user.permissions.find(
      (permission) => permission.scopeId === SCOPES.ADMIN,
    );
    return !_.isUndefined(adminScope);
  }

  isAuthor() {
    return this.user.id === this.activityReport.userId;
  }

  isCollaborator() {
    return this.activityReport.collaborators.some((user) => user.id === this.user.id);
  }

  isApprovingManager() {
    if (!this.activityReport.approvers) {
      return false;
    }
    const approverUserIds = this.activityReport.approvers.map((approval) => approval.User.id);
    return approverUserIds.includes(this.user.id);
  }

  reportHasEditableStatus() {
    return this.activityReport.submissionStatus === REPORT_STATUSES.DRAFT
      || this.activityReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  }
}
