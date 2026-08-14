import SCOPES from '../middleware/scopeConstants';

export default class Recipient {
  constructor(user, recipient, isOnRecipientsReports = false) {
    this.user = user;
    this.recipient = recipient;
    this.regionIds = this.recipient.grants.map((grant) => grant.regionId);
    this.isOnRecipientsReports = isOnRecipientsReports;
  }

  canReadInRegion(region) {
    // a goal can have multiple regions
    return this.user.permissions.some(
      (permission) =>
        (permission.scopeId === SCOPES.READ_WRITE_REPORTS ||
          permission.scopeId === SCOPES.APPROVE_REPORTS ||
          permission.scopeId === SCOPES.READ_REPORTS) &&
        permission.regionId === region
    );
  }

  canReadTrainingReportsInRegion(region) {
    return this.user.permissions.some(
      (permission) =>
        (permission.scopeId === SCOPES.READ_WRITE_TRAINING_REPORTS ||
          permission.scopeId === SCOPES.READ_REPORTS ||
          permission.scopeId === SCOPES.POC_TRAINING_REPORTS) &&
        permission.regionId === region
    );
  }

  canView() {
    return this.regionIds.some((regionId) => this.canReadInRegion(regionId));
  }

  // Used when viewing training reports/sessions for a recipient regardless of the
  // session's own region, so we check against the recipient's grant regions instead.
  canViewTrainingReports() {
    return this.regionIds.some((regionId) => this.canReadTrainingReportsInRegion(regionId));
  }

  canMergeGoals() {
    if (this.canView() && this.user?.roles?.some((r) => r.name === 'TTAC')) {
      return true;
    }

    if (this.isOnRecipientsReports) {
      return true;
    }

    return false;
  }
}
