import _ from 'lodash';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  REGIONAL_SCOPES,
  GLOBAL_SCOPES,
  REGIONS,
  ALL_REGIONS,
  CENTRAL_OFFICE,
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

  user.permissions.filter((permission) => (
    regionalScopeIds.includes(permission.scopeId)
    && ![CENTRAL_OFFICE].includes(permission.regionId)
  )).forEach(({ regionId, scopeId }) => {
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

  user.permissions.filter((permission) => globalScopeIds.includes(permission.scopeId))
    .forEach(({ scopeId }) => {
      globals[scopeId] = true;
    });

  return globals;
}
