import SCOPES from '../middleware/scopeConstants';

interface Permission {
  scopeId: number;
  regionId: number;
}

interface User {
  permissions: Permission[];
  roles?: { name: string }[];
  flags?: string[];
}

export default class Generic {
  user: User;

  constructor(user: User) {
    this.user = user;
  }

  canAccessRegion(region: number): boolean {
    // Check if the user has any scopeId for the given region
    return this.user.permissions.some((permission) => (
      Object.values(SCOPES).includes(permission.scopeId)
      && permission.regionId === region
    ));
  }

  filterRegions(regionList: number[]): number[] {
    // If the list passed is empty, return all regions the user has rights for
    if (regionList.length === 0) {
      return this.getAllAccessibleRegions();
    }

    // Return the list with only the regions the user has a right for
    return regionList.filter((region) => this.canAccessRegion(region));
  }

  getAllAccessibleRegions(): number[] {
    // Return all regions the user has rights for
    const accessibleRegions = new Set<number>();
    this.user.permissions.forEach((permission) => {
      if (Object.values(SCOPES).includes(permission.scopeId)) {
        accessibleRegions.add(permission.regionId);
      }
    });
    return Array.from(accessibleRegions);
  }

  hasFeatureFlag(flag: string): boolean {
    // Check if the user has ADMIN permissions which grants all flags
    const hasAdminPermission = this.user.permissions.some(
      (permission) => permission.scopeId === SCOPES.ADMIN,
    );

    if (hasAdminPermission) {
      return true;
    }

    // Check if the user has the specific feature flag
    return this.user.flags?.includes(flag) || false;
  }
}
