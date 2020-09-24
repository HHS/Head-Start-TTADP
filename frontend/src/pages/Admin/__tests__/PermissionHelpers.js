import _ from 'lodash';
import { createScopeObject, userRegionalPermissions, userGlobalPermissions } from '../PermissionHelpers';
import { REGIONAL_SCOPES } from '../../../Constants';

describe('PermissionHelpers', () => {
  describe('createScopeObject', () => {
    it('creates an object with scopes as keys and false as values', () => {
      const obj = createScopeObject();
      REGIONAL_SCOPES.forEach((scope) => {
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
              scope: 'READ_REPORTS',
              region: 1,
            },
          ],
        };

        regionalPermissions = userRegionalPermissions(user);
      });

      it('flags regional permissions the user has as true', () => {
        expect(regionalPermissions['1'].READ_REPORTS).toBeTruthy();
      });

      it('flags regional permissions the user does not have as false', () => {
        expect(regionalPermissions['1'].READ_WRITE_REPORTS).toBeFalsy();
      });

      it('flags regional permissions for the correct region', () => {
        expect(regionalPermissions['2'].READ_REPORTS).toBeFalsy();
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
      let globalPermissions;

      beforeEach(() => {
        const user = {
          permissions: [
            {
              scope: 'ADMIN',
              region: 0,
            },
          ],
        };
        globalPermissions = userGlobalPermissions(user);
      });

      it('flags global permissions the user has as true', () => {
        expect(globalPermissions.ADMIN).toBeTruthy();
      });

      it('flags global permissions the user does not have as false', () => {
        expect(globalPermissions.SITE_ACCESS).toBeFalsy();
      });
    });
  });
});
