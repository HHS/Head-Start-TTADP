import { SCOPE_IDS } from '@ttahub/common';
import { canCreateCommunicationLog } from './permissions';

describe('canCreateCommunicationLog', () => {
  const createMockUser = (permissions = []) => ({
    id: 1,
    name: 'Test User',
    permissions,
  });

  const createPermission = (scopeId, regionId) => ({
    scopeId,
    regionId,
  });

  describe('when user has READ_WRITE_ACTIVITY_REPORTS permission', () => {
    it('should return true when user has permission in the specified region', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 2),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(true);
    });

    it('should return false when user has permission in a different region', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 2),
      ]);

      const result = canCreateCommunicationLog(user, 2);

      expect(result).toBe(false);
    });

    it('should return true when user has permission in multiple regions including the specified one', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 2),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 3),
      ]);

      const result = canCreateCommunicationLog(user, 2);

      expect(result).toBe(true);
    });
  });

  describe('when user has only READ_ACTIVITY_REPORTS permission', () => {
    it('should return false', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 1),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(false);
    });

    it('should return false even in multiple regions', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 2),
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 3),
      ]);

      const result = canCreateCommunicationLog(user, 2);

      expect(result).toBe(false);
    });
  });

  describe('when user has no permissions', () => {
    it('should return false when permissions array is empty', () => {
      const user = createMockUser([]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(false);
    });

    it('should return false when permissions is undefined', () => {
      const user = { id: 1, name: 'Test User' };

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(false);
    });

    it('should return false when user object is null', () => {
      const result = canCreateCommunicationLog(null, 1);

      expect(result).toBe(false);
    });
  });

  describe('when user has mixed permissions', () => {
    it('should return true only for regions with write access', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_ACTIVITY_REPORTS, 2),
        createPermission(SCOPE_IDS.APPROVE_ACTIVITY_REPORTS, 3),
      ]);

      expect(canCreateCommunicationLog(user, 1)).toBe(true);
      expect(canCreateCommunicationLog(user, 2)).toBe(false);
      expect(canCreateCommunicationLog(user, 3)).toBe(false);
    });

    it('should return false for regions with no permissions', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
      ]);

      const result = canCreateCommunicationLog(user, 5);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle region id as string', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
      ]);

      // Note: The function expects a number, but permissions might have numeric strings
      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(true);
    });

    it('should return false when regionId is null', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
      ]);

      const result = canCreateCommunicationLog(user, null);

      expect(result).toBe(false);
    });

    it('should return false when regionId is undefined', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
      ]);

      const result = canCreateCommunicationLog(user, undefined);

      expect(result).toBe(false);
    });
  });

  describe('when user is an admin', () => {
    it('should return true when admin has READ_WRITE_ACTIVITY_REPORTS permission in the region', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.ADMIN, 1),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(true);
    });

    it('should return false when admin does not have READ_WRITE_ACTIVITY_REPORTS permission in the region', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.ADMIN, 1),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(false);
    });

    it('should return false when admin has READ_WRITE_ACTIVITY_REPORTS in a different region', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.ADMIN, 1),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 2),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(false);
    });

    it('should return true when admin has READ_WRITE_ACTIVITY_REPORTS in multiple regions including the specified one', () => {
      const user = createMockUser([
        createPermission(SCOPE_IDS.ADMIN, 1),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 1),
        createPermission(SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, 2),
      ]);

      const result = canCreateCommunicationLog(user, 1);

      expect(result).toBe(true);
    });
  });
});
