import isAdmin, { hasReadWrite } from '../permissions';

describe('permissions', () => {
  describe('isAdmin', () => {
    it('returns true if the user is an admin', () => {
      const user = {
        permissions: [
          {
            scopeId: 2,
          },
        ],
      };
      expect(isAdmin(user)).toBeTruthy();
    });

    it('returns false if the user is not an admin', () => {
      const user = {
        permissions: [],
      };
      expect(isAdmin(user)).toBeFalsy();
    });
  });

  describe('hasReadWrite', () => {
    it('returns true if the user has read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };
      expect(hasReadWrite(user)).toBeTruthy();
    });

    it('returns false if the user does not have read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };
      expect(hasReadWrite(user)).toBeFalsy();
    });
  });
});
