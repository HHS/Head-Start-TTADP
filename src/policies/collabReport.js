/*
  This class handles authorization for Collaboration Reports. In express handlers this
  object should be constructed with the current user and the collab report to be
  updated/retrieved for update/get or the new report for create. The permissions
  of the user are checked against the report and simple questions about the actions
  the user can take on that report are answered, mainly can the user create, update
  or get the report.
*/
import _ from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';

export default class CollabReport {
  constructor(user, collabReport) {
    this.user = user;
    this.collabReport = collabReport;
  }

  isApproverAndCreator() {
    return this.isApprovingManager() && this.isAuthor();
  }

  canReview() {
    // Ability to review is meant to be independent of report status per acceptance criteria
    return this.isApprovingManager() && this.canApproveInRegion();
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canUpdate() {
    const canUpdateAsAuthorOrCollaborator = (this.isAuthor() || this.isCollaborator())
      && this.canWriteInRegion()
      && this.reportHasEditableStatus();

    const canUpdateAsApprover = (this.canReview()
      && (
        this.collabReport.calculatedStatus === REPORT_STATUSES.SUBMITTED
        || this.collabReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION
      ));

    return canUpdateAsAuthorOrCollaborator
      || canUpdateAsApprover;
  }

  canReset() {
    return (this.isAuthor() || this.isCollaborator())
      && this.collabReport.calculatedStatus === REPORT_STATUSES.SUBMITTED;
  }

  canDelete() {
    return (this.isAdmin() || this.isAuthor() || this.isCollaborator())
      && this.collabReport.calculatedStatus !== REPORT_STATUSES.APPROVED;
  }

  canUnlock() {
    return (this.isUnlockAdmin())
      && this.collabReport.calculatedStatus === REPORT_STATUSES.APPROVED;
  }

  canViewLegacy() {
    return this.canReadInRegion();
  }

  canGet() {
    const canReadUnapproved = this.isAuthor() || this.isCollaborator() || this.isApprovingManager();

    if (canReadUnapproved) {
      return canReadUnapproved;
    }

    if (this.collabReport.calculatedStatus === REPORT_STATUSES.APPROVED) {
      // TTAHUB-1817: Admins should be allowed to read an approved report.
      if (this.isAdmin()) {
        return true;
      }

      return this.canReadInRegion();
    }

    return false;
  }

  canApproveInRegion() {
    const regionId = this.collabReport.regionId
    || (this.collabReport.dataValues && this.collabReport.dataValues.regionId);

    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.APPROVE_REPORTS
        && permission.regionId === regionId),
    );
    return !_.isUndefined(permissions);
  }

  canWriteInRegion() {
    const regionId = this.collabReport.regionId
    || (this.collabReport.dataValues && this.collabReport.dataValues.regionId);

    const permissions = _.find(
      this.user.permissions,
      (permission) => (
        permission.scopeId === SCOPES.READ_WRITE_REPORTS
        && permission.regionId === regionId),
    );
    return !_.isUndefined(permissions);
  }

  canReadInRegion() {
    const regionId = this.collabReport.regionId
    || (this.collabReport.dataValues && this.collabReport.dataValues.regionId);

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
      this.collabReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION
      || this.collabReport.approvers.some((approver) => (
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
    return this.user.id === this.collabReport.userId;
  }

  isCollaborator() {
    if (!this.collabReport.collabReportSpecialists
      || this.collabReport.collabReportSpecialists.length === 0) {
      return false;
    }

    return this.collabReport
      .collabReportSpecialists.some((collab) => collab.specialist.id === this.user.id);
  }

  isApprovingManager() {
    if (!this.collabReport.approvers) {
      return false;
    }

    const approverUserIds = this.collabReport.approvers.map((approval) => approval.user.id);
    return approverUserIds.includes(this.user.id);
  }

  // This is a helper function to determine if the report is in a state where it can be edited
  reportHasEditableStatus() {
    // if the report is in draft, it's editable
    if (this.collabReport.submissionStatus === REPORT_STATUSES.DRAFT
      || this.collabReport.calculatedStatus === REPORT_STATUSES.DRAFT) {
      return true;
    }

    // if the report is in needs action, it's editable,
    // regardless of whether the report is submitted
    if (this.collabReport.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
      return true;
    }

    return false;
  }
}
