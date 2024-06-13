import Generic from './generic';
import SCOPES from '../middleware/scopeConstants';

describe('Generic', () => {
  const user = {
    permissions: [
      { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
      { scopeId: SCOPES.APPROVE_REPORTS, regionId: 2 },
      { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 3 },
    ],
  };

  test('should correctly initialize with user', () => {
    const generic = new Generic(user);
    expect(generic.user).toBe(user);
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
    const emptyUser = { permissions: [] };
    const generic = new Generic(emptyUser);
    const filteredRegions = generic.filterRegions([]);
    expect(filteredRegions).toEqual([]);
  });

  test('should return all accessible regions', () => {
    const generic = new Generic(user);
    const accessibleRegions = generic.getAllAccessibleRegions();
    expect(accessibleRegions).toEqual([1, 2, 3]);
  });
});
