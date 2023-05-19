import SCOPES from '../middleware/scopeConstants';

export default class SessionReport {
  constructor(user, sessionReport) {
    this.user = user;
    this.sessionReport = sessionReport;
    this.permissions = user.permissions;
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
      SCOPES.READ_TRAINING_REPORTS,
      SCOPES.READ_WRITE_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === this.sessionReport.regionId);
  }

  canWriteInRegion() {
    if (this.isAdmin()) { return true; }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === this.sessionReport.regionId);
  }

  canDelete() {
    return this.isAdmin() || this.isAuthor();
  }

  canUpdate() {
    if (!this.canWriteInRegion()) { return false; }

    if (this.isAdmin()) { return true; }
    // if (this.isCollaborator()) { return true; }
    if (this.isAuthor()) { return true; }

    return false;
  }

  isAdmin() {
    return !!this.permissions.find(
      (p) => p.scopeId === SCOPES.ADMIN,
    );
  }

  // TODO: Get Event by this.trainingReport.eventId and check the
  // collaboratorIds array on it.
  // isCollaborator() {
  // }

  isAuthor() {
    return this.user.id === this.sessionReport.ownerId;
  }
}
