import { isUndefined } from 'lodash';
import SCOPES from '../middleware/scopeConstants';

interface Permission {
  regionId: number;
  scopeId: number;
}

interface UserType {
  id: number;
  permissions: Permission[];
}

interface NotificationType {
  userId: number | null;
}

export default class Notifications {
  readonly user: UserType;
  readonly notification: NotificationType;

  constructor(user: UserType, notification: NotificationType) {
    this.user = user;
    this.notification = notification;
  }

  isAdmin() {
    return !isUndefined(
      this.user.permissions.find((permission) => permission.scopeId === SCOPES.ADMIN)
    );
  }

  isOwnedNotification() {
    return this.notification.userId === this.user.id;
  }

  isGlobalNotification() {
    return this.notification.userId === null;
  }

  canUpdateNotification() {
    return this.isAdmin() || this.isOwnedNotification() || this.isGlobalNotification();
  }
}
