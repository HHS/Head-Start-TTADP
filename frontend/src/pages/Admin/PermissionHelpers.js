import { DECIMAL_BASE, MUTUALLY_EXCLUSIVE_SCOPES, SCOPE_IDS } from '@ttahub/common';
import _ from 'lodash';
import {
  ALL_REGIONS,
  CENTRAL_OFFICE,
  GLOBAL_SCOPES,
  REGIONAL_SCOPES,
  REGIONS,
} from '../../Constants';

const regionalScopeIds = Object.keys(REGIONAL_SCOPES).map((s) => parseInt(s, DECIMAL_BASE));
const globalScopeIds = Object.keys(GLOBAL_SCOPES).map((s) => parseInt(s, DECIMAL_BASE));
const allScopes = { ...REGIONAL_SCOPES, ...GLOBAL_SCOPES };

export function scopeFromId(scopeId) {
  return _.find(allScopes, (value, id) => scopeId === id);
}

/**
 * Returns an object that has every regional scope id as a key and a value of 'false'
 * @returns {Object<string, bool>} An object with scope ids as keys and bool as values
 */
export function createRegionalScopeObject() {
  return _.mapValues(REGIONAL_SCOPES, () => false);
}

/**
 * Return an object representing what permissions the user has per region.
 *
 * If a user has READ_ACTIVITY_REPORTS access on region 1 the resulting object will
 * look like {"1": {"4": true}}
 * @param {*} - user object
 * @returns {Object<string, {Object<string, bool>>}}
 */
export function userRegionalPermissions(user) {
  const regionalPermissions = {};
  [...REGIONS, ALL_REGIONS].forEach((region) => {
    regionalPermissions[region] = createRegionalScopeObject();
  });

  if (!user.permissions) {
    return regionalPermissions;
  }

  user.permissions
    .filter(
      (permission) =>
        regionalScopeIds.includes(permission.scopeId) &&
        ![CENTRAL_OFFICE].includes(permission.regionId)
    )
    .forEach(({ regionId, scopeId }) => {
      regionalPermissions[regionId][scopeId] = true;
    });

  return regionalPermissions;
}

/**
 * This method returns an object representing the global permissions for the
 * user.
 *
 * If a user has ADMIN resulting object will look like {"2": true}
 * @param {*} - user object
 * @returns {Object<string, bool>>}
 */
export function userGlobalPermissions(user) {
  const globals = _.mapValues(GLOBAL_SCOPES, () => false);

  if (!user.permissions) {
    return globals;
  }

  user.permissions
    .filter((permission) => globalScopeIds.includes(permission.scopeId))
    .forEach(({ scopeId }) => {
      globals[scopeId] = true;
    });

  return globals;
}

/**
 * Drops the permissions that can't be held alongside the scope in the regions. Dropping a
 * partner from any region also drops its "all regions" entry, which would otherwise keep it
 * checked there.
 */
export function withoutExclusivePartners(permissions, scope, regions) {
  const partners = MUTUALLY_EXCLUSIVE_SCOPES.filter((pair) => pair.includes(scope))
    .flat()
    .filter((s) => s !== scope);

  return permissions.filter(
    (permission) =>
      !(
        partners.includes(permission.scopeId) &&
        [...regions, ALL_REGIONS].includes(permission.regionId)
      )
  );
}

/**
 * The name of whoever else is each region's primary TTA request approver, keyed by region,
 * as a region can only have one
 */
export function primaryApproversByRegion(users, userId) {
  const approvers = {};
  users
    .filter((u) => u.id !== userId)
    .forEach((u) => {
      (u.permissions || [])
        .filter((p) => p.scopeId === SCOPE_IDS.APPROVE_TTA_REQUESTS)
        .forEach(({ regionId }) => {
          approvers[regionId] = u.name;
        });
    });
  return approvers;
}

/** why a region can't take a second primary TTA request approver */
export const primaryApproverMessage = (regionId, name) =>
  `Region ${regionId} already has a primary COR approver: ${name}`;
