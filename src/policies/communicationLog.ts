import SCOPES from '../middleware/scopeConstants';
import { auditLogger } from '../logger';

interface UserType {
  id: number;
  permissions: {
    regionId: number;
    scopeId: number;
  }[];
}

interface LogType {
  recipientId: number;
  userId: number;
}

export default class CommunicationLog {
  readonly user: UserType;

  readonly regionId: number;

  readonly log: LogType;

  constructor(user: UserType, regionId: number, log = { recipientId: 0, userId: 0 }) {
    this.user = user;
    this.regionId = regionId;
    this.log = log;
  }

  canCreateLog() {
    const hasWritePermission = this.user.permissions.some((permission) => (
      permission.regionId === this.regionId
      && permission.scopeId === SCOPES.READ_WRITE_REPORTS
    ));

    if (hasWritePermission) {
      return true;
    }

    if (this.isAdmin()) {
      this.logAdminAction('create communication log');
      return true;
    }

    this.logUnauthorizedAttempt('create communication log', 'user lacks write permissions in region');
    return false;
  }

  canReadLog() {
    return this.user.permissions.some((permission) => (
      permission.regionId === this.regionId
        && ([SCOPES.READ_WRITE_REPORTS, SCOPES.READ_REPORTS].includes(permission.scopeId))
    )) || this.isAdmin();
  }

  canUpdateLog() {
    if (this.isAdmin()) {
      this.logAdminAction('update communication log');
      return true;
    }

    if (this.user.id === this.log.userId) {
      return true;
    }

    this.logUnauthorizedAttempt('update communication log', 'user is not the creator');
    return false;
  }

  canDeleteLog() {
    if (this.isAdmin()) {
      this.logAdminAction('delete communication log');
      return true;
    }

    if (this.user.id === this.log.userId) {
      return true;
    }

    this.logUnauthorizedAttempt('delete communication log', 'user is not the creator');
    return false;
  }

  canUploadFileToLog() {
    if (this.isAdmin()) {
      this.logAdminAction('upload file to communication log');
      return true;
    }

    if (this.user.id === this.log.userId) {
      return true;
    }

    this.logUnauthorizedAttempt('upload file to communication log', 'user is not the creator');
    return false;
  }

  isAdmin() {
    return this.user.permissions.some((permission) => (
      permission.scopeId === SCOPES.ADMIN
    ));
  }

  private logAdminAction(action: string) {
    auditLogger.info(`Communication log admin override: userId=${this.user.id}, action=${action}, regionId=${this.regionId}, recipientId=${this.log.recipientId}`);
  }

  private logUnauthorizedAttempt(action: string, reason: string) {
    auditLogger.warn(`Communication log unauthorized attempt: userId=${this.user.id}, action=${action}, regionId=${this.regionId}, recipientId=${this.log.recipientId}, reason=${reason}`);
  }
}
