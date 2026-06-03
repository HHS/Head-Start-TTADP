import SCOPES from '../middleware/scopeConstants';
import Notifications from './notifications';

describe('NotificationsPolicy', () => {
  const adminUser = {
    id: 1,
    permissions: [{ regionId: 1, scopeId: SCOPES.ADMIN }],
  };

  const regularUser = {
    id: 2,
    permissions: [{ regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS }],
  };

  const ownedNotification = { userId: 2 };
  const otherNotification = { userId: 99 };
  const globalNotification = { userId: undefined };

  describe('isAdmin', () => {
    it('returns true when user has the ADMIN scope', () => {
      const policy = new Notifications(adminUser, ownedNotification);
      expect(policy.isAdmin()).toBe(true);
    });

    it('returns false when user does not have the ADMIN scope', () => {
      const policy = new Notifications(regularUser, ownedNotification);
      expect(policy.isAdmin()).toBe(false);
    });
  });

  describe('isOwnedNotification', () => {
    it('returns true when notification userId matches user id', () => {
      const policy = new Notifications(regularUser, ownedNotification);
      expect(policy.isOwnedNotification()).toBe(true);
    });

    it('returns false when notification userId does not match user id', () => {
      const policy = new Notifications(regularUser, otherNotification);
      expect(policy.isOwnedNotification()).toBe(false);
    });

    it('returns false for global notifications with undefined userId', () => {
      const policy = new Notifications(regularUser, globalNotification);
      expect(policy.isOwnedNotification()).toBe(false);
    });
  });

  describe('canUpdateNotification', () => {
    it('returns true when user is admin even if not the owner', () => {
      const policy = new Notifications(adminUser, otherNotification);
      expect(policy.canUpdateNotification()).toBe(true);
    });

    it('returns true when user is the notification owner', () => {
      const policy = new Notifications(regularUser, ownedNotification);
      expect(policy.canUpdateNotification()).toBe(true);
    });

    it('returns false when user is neither admin nor owner', () => {
      const policy = new Notifications(regularUser, otherNotification);
      expect(policy.canUpdateNotification()).toBe(false);
    });
  });
});
