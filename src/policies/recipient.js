import SCOPES from '../middleware/scopeConstants';

export default class Recipient {
  constructor(user, recipient) {
    this.user = user;
    this.recipient = recipient;
    this.regionIds = this.recipient.grants.map((grant) => grant.regionId);
  }

  canReadInRegion(region) {
    // a goal can have multiple regions
    return this.user.permissions.some((permission) => (
      permission.scopeId === SCOPES.READ_WRITE_REPORTS
      || permission.scopeId === SCOPES.APPROVE_REPORTS
      || permission.scopeId === SCOPES.READ_REPORTS
    )
    && permission.regionId === region);
  }

  canView() {
    return this.regionIds.some((regionId) => this.canReadInRegion(regionId));
  }
}
