import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

// matches getUserTtaRequestReadRegions in src/services/accessValidation.js
const READ_SCOPES = [
  SCOPES.READ_REPORTS,
  SCOPES.READ_WRITE_TTA_REQUESTS,
  SCOPES.REVIEW_TTA_REQUESTS,
  SCOPES.APPROVE_TTA_REQUESTS,
  SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
];

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
  reviewerId?: number | null;
  status: string;
}

// the creator edits a request while it is a draft, and again when it is sent back for changes
const EDITABLE_STATUSES: string[] = [TTA_REQUEST_STATUSES.DRAFT, TTA_REQUEST_STATUSES.NEEDS_ACTION];

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
   * Only the creator saves a draft, or a request sent back to them for changes, and only
   * while they can still write in its region. An admin can also save a request sent back
   * for changes, e.g. when its creator is unavailable.
   */
  canUpdate() {
    if (this.isAdmin() && this.ttaRequest?.status === TTA_REQUEST_STATUSES.NEEDS_ACTION) {
      return true;
    }

    if (!this.isCreator()) {
      this.logUnauthorizedAttempt('update TTA request', 'user is not the creator');
      return false;
    }

    if (!EDITABLE_STATUSES.includes(this.ttaRequest?.status)) {
      this.logUnauthorizedAttempt('update TTA request', 'request is not editable');
      return false;
    }

    if (!this.canWriteInRegion()) {
      this.logUnauthorizedAttempt('update TTA request', 'user lacks write permissions in region');
      return false;
    }

    return true;
  }

  /**
   * Only the request's reviewer reviews it, once it has been submitted to them, and only
   * while they can still review in its region
   */
  canReview() {
    if (!this.isReviewer()) {
      this.logUnauthorizedAttempt('review TTA request', 'user is not the reviewer');
      return false;
    }

    if (this.ttaRequest?.status !== TTA_REQUEST_STATUSES.SUBMITTED) {
      this.logUnauthorizedAttempt('review TTA request', 'request is not submitted');
      return false;
    }

    if (!this.canReviewInRegion()) {
      this.logUnauthorizedAttempt('review TTA request', 'user lacks review permissions in region');
      return false;
    }

    return true;
  }

  // the request's reviewerId is who reviews it. Its reviewer approver row is only synced to it
  // on submission, and the creator can change the reviewer while it is back with them, so the
  // two agree whenever the request is submitted, which is the only time it can be reviewed
  isReviewer() {
    return !!this.ttaRequest?.reviewerId && this.ttaRequest.reviewerId === this.user.id;
  }

  canReviewInRegion() {
    return this.user.permissions.some(
      (permission) =>
        permission.regionId === this.regionId && permission.scopeId === SCOPES.REVIEW_TTA_REQUESTS
    );
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
        permission.regionId === this.regionId &&
        permission.scopeId === SCOPES.READ_WRITE_TTA_REQUESTS
    );
  }

  /**
   * Requests are read with the reports read permission, or any TTA request permission
   */
  canReadInRegion() {
    return this.user.permissions.some(
      (permission) =>
        permission.regionId === this.regionId && READ_SCOPES.includes(permission.scopeId)
    );
  }

  private logUnauthorizedAttempt(action: string, reason: string) {
    auditLogger.warn(
      `TTA request unauthorized attempt: userId=${this.user.id}, action=${action}, regionId=${this.regionId}, ttaRequestId=${this.ttaRequest?.id}, reason=${reason}`
    );
  }
}
