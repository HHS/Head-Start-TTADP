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
    ));
  }

  canReadLog() {
    return this.user.permissions.some((permission) => (
      permission.regionId === this.regionId
        && permission.scopeId === SCOPES.READ_WRITE_REPORTS
    ));
  }

  canUpdateLog() {
    return this.user.id === this.log.userId;
  }

  canDeleteLog() {
    return this.canUpdateLog();
  }
}
