/*
  This class handles authorization for Activity Reports. In express handlers this
  object should be constructed with the current user and the activity report to be
  updated/retrieved for update/get or the new report for create. The permissions
  of the user are checked against the report and simple questions about the actions
  the user can take on that report are answered, mainly can the user create, update
  or get the report.
*/
import _ from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';

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
    const canUpdateAsAuthorAndCollaborator = (this.isAuthor() || this.isCollaborator())
      && this.canWriteInRegion()
      && this.reportHasEditableStatus();

    const canUpdateAsApprover = (this.canReview()
      && this.activityReport.calculatedStatus === REPORT_STATUSES.SUBMITTED);

    return canUpdateAsAuthorAndCollaborator
      || (canUpdateAsApprover && !this.hasBeenMarkedByApprover());
  }

  canReset() {
    return (this.isAuthor() || this.isCollaborator())
      && this.activityReport.calculatedStatus === REPORT_STATUSES.SUBMITTED;
  }

  canDelete() {
    return (this.isAdmin() || this.isAuthor())
      && this.activityReport.calculatedStatus !== REPORT_STATUSES.APPROVED;
  }

  canUnlock() {
    return (this.isUnlockAdmin())
      && this.activityReport.calculatedStatus === REPORT_STATUSES.APPROVED;
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
      // TTAHUB-1817: Admins should be allowed to read an approved report.
      if (this.isAdmin()) {
        return true;
      }

      return this.canReadInRegion();
    }

    return false;
  }

  canApproveInRegion() {
    const regionId = this.activityReport.regionId
    || (this.activityReport.dataValues && this.activityReport.dataValues.regionId);

    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.APPROVE_REPORTS
        && permission.regionId === regionId),
    );
    return !_.isUndefined(permissions);
  }

  canWriteInRegion() {
    const regionId = this.activityReport.regionId
    || (this.activityReport.dataValues && this.activityReport.dataValues.regionId);

    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.READ_WRITE_REPORTS
        && permission.regionId === regionId),
    );
    return !_.isUndefined(permissions);
  }

  canReadInRegion() {
    const regionId = this.activityReport.regionId
    || (this.activityReport.dataValues && this.activityReport.dataValues.regionId);

    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        (permission.scopeId === SCOPES.READ_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS
          || permission.scopeId === SCOPES.READ_WRITE_REPORTS)
        && permission.regionId === regionId),
    );
    return !_.isUndefined(permissions);
  }

  hasBeenMarkedByApprover() {
    return (
      this.activityReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION
      || this.activityReport.approvers.some((approver) => (
        approver.status === REPORT_STATUSES.APPROVED
      ))
    );
  }

  isAdmin() {
    const adminScope = this.user.permissions.find(
      (permission) => permission.scopeId === SCOPES.ADMIN,
    );
    return !_.isUndefined(adminScope);
  }

  isUnlockAdmin() {
    const adminScope = this.user.permissions.find(
      (permission) => permission.scopeId === SCOPES.UNLOCK_APPROVED_REPORTS,
    );
    return !_.isUndefined(adminScope);
  }

  isAuthor() {
    return this.user.id === this.activityReport.userId;
  }

  isCollaborator() {
    if (!this.activityReport.activityReportCollaborators
      || this.activityReport.activityReportCollaborators.length === 0) {
      return false;
    }

    return this.activityReport
      .activityReportCollaborators.some((collab) => collab.user.id === this.user.id);
  }

  isApprovingManager() {
    if (!this.activityReport.approvers) {
      return false;
    }
    const approverUserIds = this.activityReport.approvers.map((approval) => approval.user.id);
    return approverUserIds.includes(this.user.id);
  }

  // This is a helper function to determine if the report is in a state where it can be edited
  reportHasEditableStatus() {
    // if the report is in draft
    return this.activityReport.submissionStatus === REPORT_STATUSES.DRAFT
    // or if it's been marked as needs action
      || this.activityReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION || (
    // or if it's submitted and the calculated status is not submitted for some reason
      this.activityReport.submissionStatus === REPORT_STATUSES.SUBMITTED
        && this.activityReport.calculatedStatus !== REPORT_STATUSES.SUBMITTED
    );
  }
}
