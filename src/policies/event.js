import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';

export default class EventReport {
  constructor(user, eventReport) {
    this.user = user;
    this.eventReport = eventReport;
    this.permissions = user.permissions || [];
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canRead() {
    return this.canReadInRegion();
  }

  canReadInRegion() {
    if (this.isAdmin()) { return true; }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
      SCOPES.READ_REPORTS,
      SCOPES.READ_WRITE_REPORTS,
    ].includes(p.scopeId) && p.regionId === this.eventReport.regionId);
  }

  hasPocInRegion() {
    // eslint-disable-next-line max-len
    return !!this.permissions.find((p) => p.scopeId === SCOPES.POC_TRAINING_REPORTS && p.regionId === this.eventReport.regionId);
  }

  /**
   * Determines if the user has write access to the specified region
   * or to the region of their current event report.
   *
   * @param {string|null} regionId - The ID of the region to check access for.
   * If null, checks the region of the given event report.
   *
   * @returns {boolean} - Returns true if the user has write access to the region,
   * otherwise returns false.
   *
   * @throws {Error} When the regionId is not provided and there is no event report available.
   */
  canWriteInRegion(regionId = null) {
    if (this.isAdmin()) { return true; }

    if (regionId == null) {
      return !!this.permissions.find((p) => [
        SCOPES.READ_WRITE_TRAINING_REPORTS,
      ].includes(p.scopeId) && p.regionId === this.eventReport.regionId);
    }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === regionId);
  }

  /**
   * Returns an array of region IDs for which the user has read permission
   * on training reports.
   *
   * @returns {number[]} An array of readable region IDs.
   * @throws {Error} if permissions data is missing or invalid.
   */
  get readableRegions() {
    const viablePermissions = this.permissions.filter((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
      SCOPES.READ_REPORTS,
      SCOPES.READ_WRITE_REPORTS,
    ].includes(p.scopeId));

    return viablePermissions.map((p) => Number(p.regionId));
  }

  /**
   * Returns an array of region IDs for which the user has write permission
   * on training reports.
   *
   * @returns {number[]} An array of writable region IDs.
   * @throws {Error} if permissions data is missing or invalid.
   */
  get writableRegions() {
    const viablePermissions = this.permissions.filter((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
    ].includes(p.scopeId));

    return viablePermissions.map((p) => Number(p.regionId));
  }

  canDelete() {
    const ALLOWED_DELETED_STATUS = [
      TRAINING_REPORT_STATUSES.NOT_STARTED,
      TRAINING_REPORT_STATUSES.SUSPENDED,
    ];

    if (!ALLOWED_DELETED_STATUS.includes(this.eventReport.data.status)) {
      return false;
    }

    return this.isAdmin() || this.isAuthor();
  }

  // This should work without a event object.
  canGetTrainingReportUsersInRegion(regionId) {
    if (this.isAdmin()) { return true; }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS, SCOPES.POC_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === regionId);
  }

  canGetGroupsForEditingSession() {
    if (this.isAdmin()) { return true; }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
      SCOPES.POC_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === this.eventReport.regionId);
  }

  isAdmin() {
    return !!this.permissions.find(
      (p) => p.scopeId === SCOPES.ADMIN,
    );
  }

  isAuthor() {
    return this.user.id === this.eventReport.ownerId;
  }

  isPoc() {
    return this.eventReport.pocIds && this.eventReport.pocIds.includes(this.user.id);
  }

  isCollaborator() {
    return this.eventReport.collaboratorIds.includes(this.user.id);
  }

  // some handy & fun aliases
  canEditEvent() {
    return this.isAdmin() || this.isAuthor();
  }

  canCreateSession() {
    return this.isAdmin() || this.isAuthor() || this.isCollaborator();
  }

  canEditSession() {
    return this.isAdmin() || this.isAuthor() || this.isCollaborator() || this.isPoc();
  }

  canUploadFile() {
    return this.canEditSession();
  }

  canDeleteSession() {
    return this.canEditSession();
  }

  canSuspendOrCompleteEvent() {
    return this.isAdmin() || this.isAuthor();
  }

  canSeeAlerts() {
    return this.isAdmin() || !!this.permissions.find(
      (p) => p.scopeId === SCOPES.READ_WRITE_TRAINING_REPORTS,
    ) || !!this.permissions.find(
      (p) => p.scopeId === SCOPES.POC_TRAINING_REPORTS,
    );
  }
}
