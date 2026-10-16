import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

interface UserType {
  id: number;
  permissions: {
    regionId: number;
    scopeId: number;
  }[];
}

interface TtaRequestType {
  id: number;
  userId: number;
  status: string;
}

export default class TtaRequest {
  readonly user: UserType;

  readonly regionId: number;

  readonly ttaRequest: TtaRequestType | null;

  constructor(user: UserType, regionId: number, ttaRequest: TtaRequestType | null = null) {
    this.user = user;
    this.regionId = regionId;
    this.ttaRequest = ttaRequest;
  }

  canCreate() {
    if (this.canWriteInRegion()) {
      return true;
    }

    this.logUnauthorizedAttempt('create TTA request', 'user lacks write permissions in region');
    return false;
  }

  /**
   * A draft is private to its creator until it is submitted. Without a request, this is
   * whether the user can see the region's requests at all.
   */
  canGet() {
    if (this.ttaRequest?.status === TTA_REQUEST_STATUSES.DRAFT) {
      return this.isCreator();
    }

    return this.isCreator() || this.canReadInRegion() || this.isAdmin();
  }

  /**
   * Only the creator saves a draft, and only while they can still write in its region
   */
  canUpdate() {
    if (!this.isCreator()) {
      this.logUnauthorizedAttempt('update TTA request', 'user is not the creator');
      return false;
    }

    if (this.ttaRequest?.status !== TTA_REQUEST_STATUSES.DRAFT) {
      this.logUnauthorizedAttempt('update TTA request', 'request is not a draft');
      return false;
    }

    if (!this.canWriteInRegion()) {
      this.logUnauthorizedAttempt('update TTA request', 'user lacks write permissions in region');
      return false;
    }

    return true;
  }

  isCreator() {
    return !!this.ttaRequest && this.ttaRequest.userId === this.user.id;
  }

  isAdmin() {
    return this.user.permissions.some((permission) => permission.scopeId === SCOPES.ADMIN);
  }

  canWriteInRegion() {
    return this.user.permissions.some(
      (permission) =>
        permission.regionId === this.regionId && permission.scopeId === SCOPES.READ_WRITE_REPORTS
    );
  }

  canReadInRegion() {
    return this.user.permissions.some(
      (permission) =>
        permission.regionId === this.regionId &&
        [SCOPES.READ_WRITE_REPORTS, SCOPES.READ_REPORTS].includes(permission.scopeId)
    );
  }

  private logUnauthorizedAttempt(action: string, reason: string) {
    auditLogger.warn(
      `TTA request unauthorized attempt: userId=${this.user.id}, action=${action}, regionId=${this.regionId}, ttaRequestId=${this.ttaRequest?.id}, reason=${reason}`
    );
  }
}
