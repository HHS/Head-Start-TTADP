import { SCOPE_IDS } from '@ttahub/common';
import _ from 'lodash';
import {
  createRegionalScopeObject,
  primaryApproverMessage,
  primaryApproversByRegion,
  userGlobalPermissions,
  userRegionalPermissions,
  withoutExclusivePartners,
} from '../PermissionHelpers';

const { ADMIN, READ_ACTIVITY_REPORTS, READ_WRITE_ACTIVITY_REPORTS, UNLOCK_APPROVED_REPORTS } =
  SCOPE_IDS;

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

      expect(Object.keys(regionalPermissions).length).toBe(13);
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

  describe('withoutExclusivePartners', () => {
    const { APPROVE_TTA_REQUESTS, BACKUP_APPROVE_TTA_REQUESTS, REVIEW_TTA_REQUESTS } = SCOPE_IDS;
    const permissions = [
      { regionId: 1, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
      { regionId: 2, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
      { regionId: 15, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
      { regionId: 1, scopeId: REVIEW_TTA_REQUESTS },
    ];

    it("drops the scope's partner in the regions, and its all regions entry", () => {
      expect(withoutExclusivePartners(permissions, APPROVE_TTA_REQUESTS, [1])).toEqual([
        { regionId: 2, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
        { regionId: 1, scopeId: REVIEW_TTA_REQUESTS },
      ]);
    });

    it('keeps everything for a scope without a partner', () => {
      expect(withoutExclusivePartners(permissions, REVIEW_TTA_REQUESTS, [1])).toEqual(permissions);
    });
  });

  describe('primaryApproversByRegion', () => {
    const { APPROVE_TTA_REQUESTS, BACKUP_APPROVE_TTA_REQUESTS } = SCOPE_IDS;

    it("names each region's primary approver, leaving out the user being edited and backups", () => {
      const users = [
        {
          id: 1,
          name: 'Ross Geller',
          permissions: [{ regionId: 2, scopeId: APPROVE_TTA_REQUESTS }],
        },
        {
          id: 2,
          name: 'Monica Geller',
          permissions: [
            { regionId: 3, scopeId: APPROVE_TTA_REQUESTS },
            { regionId: 4, scopeId: BACKUP_APPROVE_TTA_REQUESTS },
          ],
        },
        { id: 3, name: 'No Permissions' },
      ];

      expect(primaryApproversByRegion(users, 1)).toEqual({ 3: 'Monica Geller' });
    });
  });

  describe('primaryApproverMessage', () => {
    it('names the region and its primary approver', () => {
      expect(primaryApproverMessage(3, 'Monica Geller')).toBe(
        'Region 3 already has a primary COR approver: Monica Geller'
      );
    });
  });
});
