import { find, isUndefined } from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Recipient {
  constructor(user, recipient, regionId) {
    this.user = user;
    this.recipient = recipient;
    this.regionId = regionId;
  }

  canReadInRegion(region) {
    // a goal can have multiple regions
    const permissions = find(
      this.user.permissions,
      (permission) => (
        (
          permission.scopeId === SCOPES.READ_WRITE_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS
          || permission.scopeId === SCOPES.READ_REPORTS
        )
        && permission.regionId === region),
    );
    return !isUndefined(permissions);
  }

  canView() {
    const region = this.regionId;
    return this.canReadInRegion(region);
  }
}
