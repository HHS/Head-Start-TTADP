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
    // Convert Sequelize model instance to plain object
    this.user = user?.get({ plain: true }) || { permissions: [] };
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
    const hasAdminPermission = this.user?.permissions?.some(
      (permission) => permission.scopeId === SCOPES.ADMIN,
    ) || false;

    if (hasAdminPermission) {
      return true;
    }

    // Check if the user has the specific feature flag
    return this.user.flags?.includes(flag) || false;
  }

  checkPermissions(
    targetString: string,
    matchStrings: string[],
    featureFlag: string,
  ): boolean {
    // Check if any of the matchStrings are included in the targetString
    const hasMatch = matchStrings.some((matchString) => targetString.includes(matchString));

    // If there's a match, check the feature flag
    if (hasMatch) {
      return this.hasFeatureFlag(featureFlag);
    }

    // Default: Allow access if no match
    return true;
  }
}
