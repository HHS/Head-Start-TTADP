import _ from 'lodash'
import SCOPES from '../middleware/scopeConstants'

// Type guard to check if the user is a DBUser
function isDBUser(user) {
  return user?.get !== undefined
}

export default class Users {
  constructor(user) {
    if (isDBUser(user)) {
      this.user = user.get({ plain: true })
    } else {
      this.user = user || { permissions: [] }
    }
  }

  /**
   * borrowed this from the ActivityReports policy because it seems to make a lot of
   * sense for it to live in here
   * @returns {bool}, whether the user is an admin
   */
  isAdmin() {
    return this.user.permissions && this.user.permissions.some((permission) => permission.scopeId === SCOPES.ADMIN)
  }

  /**
   * if the user is an admin or the user has specific permissions to
   * view a feature flag, this will return true
   * @param {string} flag the name of the feature flag
   * @returns {bool} whether the user can view the feature flag
   */
  canSeeBehindFeatureFlag(flag) {
    return this.isAdmin() || !!this.user.flags.find((f) => f === flag)
  }

  getAllAccessibleRegions() {
    // Return all regions the user has rights for
    const accessibleRegions = new Set()
    this.user.permissions.forEach((permission) => {
      if (Object.values(SCOPES).includes(permission.scopeId)) {
        accessibleRegions.add(permission.regionId)
      }
    })
    return Array.from(accessibleRegions)
  }

  canAccessRegion(region) {
    // Check if the user has any scopeId for the given region
    return this.user.permissions.some((permission) => Object.values(SCOPES).includes(permission.scopeId) && permission.regionId === region)
  }

  filterRegions(regionList) {
    // If the list passed is empty, return all regions the user has rights for
    if (regionList.length === 0) {
      return this.getAllAccessibleRegions()
    }

    // Return the list with only the regions the user has a right for
    return regionList.filter((region) => this.canAccessRegion(region))
  }

  canViewUsersInRegion(region) {
    const permissions = this.user.permissions.find(
      (permission) =>
        (permission.scopeId === SCOPES.READ_WRITE_REPORTS ||
          permission.scopeId === SCOPES.READ_REPORTS ||
          permission.scopeId === SCOPES.APPROVE_REPORTS) &&
        permission.regionId === region
    )
    return !_.isUndefined(permissions)
  }

  canViewCitationsInRegion(region) {
    const permissions = this.user.permissions.find(
      (permission) =>
        (permission.scopeId === SCOPES.READ_WRITE_REPORTS ||
          permission.scopeId === SCOPES.READ_REPORTS ||
          permission.scopeId === SCOPES.APPROVE_REPORTS) &&
        permission.regionId === region
    )
    return !_.isUndefined(permissions)
  }

  canWriteInAtLeastOneRegion() {
    const permissions = this.user.permissions.find(
      (permission) => permission.scopeId === SCOPES.READ_WRITE_REPORTS || permission.scopeId === SCOPES.APPROVE_REPORTS
    )
    return !_.isUndefined(permissions)
  }

  canWriteInRegion(region) {
    const permissions = this.user.permissions.find(
      (permission) =>
        (permission.scopeId === SCOPES.READ_WRITE_REPORTS || permission.scopeId === SCOPES.APPROVE_REPORTS) && permission.regionId === region
    )
    return !_.isUndefined(permissions)
  }

  checkPermissions(targetString, matchStrings, featureFlag) {
    // Check if any of the matchStrings are included in the targetString
    const hasMatch = matchStrings.some((matchString) => targetString.includes(matchString))

    // If there's a match, check the feature flag
    if (hasMatch) {
      return this.canSeeBehindFeatureFlag(featureFlag)
    }

    // Default: Allow access if no match
    return true
  }
}
