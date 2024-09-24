import Generic from './generic';
import SCOPES from '../middleware/scopeConstants';

describe('Generic', () => {
  const user = {
    get: () => ({
      permissions: [
        { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
        { scopeId: SCOPES.APPROVE_REPORTS, regionId: 2 },
        { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 3 },
      ],
      roles: [{ name: 'Admin' }],
      flags: ['feature-flag-1', 'feature-flag-2'],
    }),
  };

  const adminUser = {
    get: () => ({
      permissions: [
        { scopeId: SCOPES.ADMIN, regionId: 1 },
      ],
      roles: [{ name: 'Super Admin' }],
      flags: [],
    }),
  };

  test('should correctly initialize with user', () => {
    const generic = new Generic(user);
    expect(generic.user).toStrictEqual(user.get());
  });

  test('should return true if user can access a region', () => {
    const generic = new Generic(user);
    expect(generic.canAccessRegion(1)).toBe(true);
    expect(generic.canAccessRegion(2)).toBe(true);
    expect(generic.canAccessRegion(3)).toBe(true);
  });

  test('should return false if user cannot access a region', () => {
    const generic = new Generic(user);
    expect(generic.canAccessRegion(4)).toBe(false);
  });

  test('should filter regions based on user permissions', () => {
    const generic = new Generic(user);
    const regionList = [1, 2, 3, 4];
    const filteredRegions = generic.filterRegions(regionList);
    expect(filteredRegions).toEqual([1, 2, 3]);
  });

  test('should return all accessible regions if region list is empty', () => {
    const generic = new Generic(user);
    const filteredRegions = generic.filterRegions([]);
    expect(filteredRegions).toEqual([1, 2, 3]);
  });

  test('should return an empty array if user has no permissions', () => {
    const emptyUser = { get: () => ({ permissions: [] }) };
    const generic = new Generic(emptyUser);
    const filteredRegions = generic.filterRegions([]);
    expect(filteredRegions).toEqual([]);
  });

  test('should return all accessible regions', () => {
    const generic = new Generic(user);
    const accessibleRegions = generic.getAllAccessibleRegions();
    expect(accessibleRegions).toEqual([1, 2, 3]);
  });

  // New test cases

  test('should return true if user has a specific feature flag', () => {
    const generic = new Generic(user);
    expect(generic.hasFeatureFlag('feature-flag-1')).toBe(true);
    expect(generic.hasFeatureFlag('feature-flag-2')).toBe(true);
  });

  test('should return false if user does not have a specific feature flag', () => {
    const generic = new Generic(user);
    expect(generic.hasFeatureFlag('non-existent-flag')).toBe(false);
  });

  test('should return true for any feature flag if user has ADMIN permission', () => {
    const generic = new Generic(adminUser);
    expect(generic.hasFeatureFlag('any-flag')).toBe(true);
    expect(generic.hasFeatureFlag('another-flag')).toBe(true);
  });

  test('should return false for feature flag if user has no flags and is not ADMIN', () => {
    const userWithoutFlags = {
      get: () => ({
        permissions: [
          { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
        ],
        roles: [{ name: 'User' }],
        flags: [],
      }),
    };
    const generic = new Generic(userWithoutFlags);
    expect(generic.hasFeatureFlag('feature-flag-1')).toBe(false);
  });

  test('should return true for feature flag if user is ADMIN even if no flags are defined', () => {
    const generic = new Generic(adminUser);
    expect(generic.hasFeatureFlag('any-flag')).toBe(true);
  });
});
