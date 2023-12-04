import SCOPES from '../middleware/scopeConstants';

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
    return this.user.permissions.some((permission) => (
      permission.regionId === this.regionId
      && permission.scopeId === SCOPES.READ_WRITE_REPORTS
    )) || this.isAdmin();
  }

  canReadLog() {
    return this.user.permissions.some((permission) => (
      permission.regionId === this.regionId
        && ([SCOPES.READ_WRITE_REPORTS, SCOPES.READ_REPORTS].includes(permission.scopeId))
    )) || this.isAdmin();
  }

  canUpdateLog() {
    return this.user.id === this.log.userId || this.isAdmin();
  }

  canDeleteLog() {
    return this.canUpdateLog();
  }

  canUploadFileToLog() {
    return this.canUpdateLog();
  }

  isAdmin() {
    return this.user.permissions.some((permission) => (
      permission.scopeId === SCOPES.ADMIN
    ));
  }
}
