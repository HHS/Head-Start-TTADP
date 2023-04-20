import _ from 'lodash';
import { SCOPE_IDS } from '@ttahub/common';
import { createRegionalScopeObject, userRegionalPermissions, userGlobalPermissions } from '../PermissionHelpers';

const {
  ADMIN,
  READ_ACTIVITY_REPORTS,
  READ_WRITE_ACTIVITY_REPORTS,
  UNLOCK_APPROVED_REPORTS,
} = SCOPE_IDS;

describe('PermissionHelpers', () => {
  describe('createRegionalScopeObject', () => {
    it('creates an object with scopes as keys and false as values', () => {
      const obj = createRegionalScopeObject();
      _.forEach((value, scope) => {
        expect(obj[scope]).toBeFalsy();
      });
    });
  });

  describe('userRegionalPermissions', () => {
    it('returns an all false object for a user with no permissions', () => {
      const regionalPermissions = userRegionalPermissions({});

      expect(Object.keys(regionalPermissions).length).toBe(12);
      _.forEach(regionalPermissions, (scopes) => {
        expect(_.every(scopes, (scope) => scope === false)).toBeTruthy();
      });
    });

    describe('for a user with permissions', () => {
      let regionalPermissions;

      beforeEach(() => {
        const user = {
          permissions: [
            {
              scopeId: READ_ACTIVITY_REPORTS,
              regionId: 1,
            },
          ],
        };

        regionalPermissions = userRegionalPermissions(user);
      });

      it('flags regional permissions the user has as true', () => {
        expect(regionalPermissions['1'][READ_ACTIVITY_REPORTS]).toBeTruthy();
      });

      it('flags regional permissions the user does not have as false', () => {
        expect(regionalPermissions['1'][READ_WRITE_ACTIVITY_REPORTS]).toBeFalsy();
      });

      it('flags regional permissions for the correct region', () => {
        expect(regionalPermissions['2'][READ_ACTIVITY_REPORTS]).toBeFalsy();
      });
    });
  });

  describe('userGlobalPermissions', () => {
    it('returns an all false object for a user with no scopes', () => {
      const globalPermissions = userGlobalPermissions({});
      expect(Object.keys(globalPermissions).length).not.toBe(0);
      expect(_.every(globalPermissions, (p) => p === false)).toBeTruthy();
    });

    describe('for a user with permissions', () => {
      it('flags global permissions the user has as true', () => {
        const user = {
          permissions: [
            {
              scopeId: ADMIN,
              regionId: 14,
            },
            {
              scopeId: UNLOCK_APPROVED_REPORTS,
              regionId: 14,
            },
          ],
        };
        const globalPermissions = userGlobalPermissions(user);
        expect(globalPermissions['2']).toBeTruthy();
        expect(globalPermissions['6']).toBeTruthy();
      });

      it('flags global permissions the user does not have as false', () => {
        const user = {
          permissions: [],
        };
        const globalPermissions = userGlobalPermissions(user);
        expect(globalPermissions['2']).toBeFalsy();
        expect(globalPermissions['6']).toBeFalsy();
      });
    });
  });
});
