import SCOPES from '../middleware/scopeConstants';

export default class TrainingReport {
  constructor(user, trainingReport) {
    this.user = user;
    this.trainingReport = trainingReport;
    this.permissions = user.permissions;
  }

  canCreate() {
    return this.canWriteInRegion();
  }

  canReadInRegion() {
    return !!this.permissions.find(
      (p) => (p.scopeId === SCOPES.READ_TRAINING_REPORTS
        || p.scopeId === SCOPES.READ_WRITE_TRAINING_REPORTS
        || p.scopeId === SCOPES.APPROVE_TRAINING_REPORTS)
          && p.regionId === this.trainingReport.regionId,
    );
  }

  canWriteInRegion() {
    return !!this.permissions.find(
      (p) => p.scopeId === SCOPES.READ_WRITE_TRAINING_REPORTS
          && p.regionId === this.trainingReport.regionId,
    );
  }

  canDelete() {
    return this.isAdmin() || this.isAuthor();
  }

  isAdmin() {
    return !!this.permissions.find(
      (p) => p.scopeId === SCOPES.ADMIN,
    );
  }

  isAuthor() {
    return this.user.id === this.trainingReport.ownerId;
  }
}
