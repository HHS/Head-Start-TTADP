import SCOPES from '../middleware/scopeConstants';

export default class EventReport {
  constructor(user, eventReport) {
    this.user = user;
    this.eventReport = eventReport;
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
    ].includes(p.scopeId) && p.regionId === this.eventReport.regionId);
  }

  canWriteInRegion() {
    if (this.isAdmin()) { return true; }

    return !!this.permissions.find((p) => [
      SCOPES.READ_WRITE_TRAINING_REPORTS,
    ].includes(p.scopeId) && p.regionId === this.eventReport.regionId);
  }

  canDelete() {
    return this.isAdmin() || this.isAuthor();
  }

  canUpdate() {
    if (!this.canWriteInRegion()) { return false; }

    if (this.isAdmin()) { return true; }
    if (this.isCollaborator()) { return true; }
    if (this.isAuthor()) { return true; }

    return false;
  }

  isAdmin() {
    return !!this.permissions.find(
      (p) => p.scopeId === SCOPES.ADMIN,
    );
  }

  isAuthor() {
    return this.user.id === this.eventReport.ownerId;
  }

  isCollaborator() {
    return this.eventReport.collaboratorIds.includes(this.user.id);
  }
}
