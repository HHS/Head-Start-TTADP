import { REGIONAL_SCOPES, GLOBAL_SCOPES, REGIONS } from '../../Constants';

/**
 * Returns an object that has every regional scope as a key and a value of 'false'
 * @returns {Object<string, bool>} An object with SCOPEs as keys and bool as values
 */
export function createScopeObject() {
  return REGIONAL_SCOPES.reduce((acc, cur) => {
    acc[cur.name] = false;
    return acc;
  }, {});
}

/**
 * Return an object representing what permissions the user has per region.
 *
 * If a user has READ_REPORTS access on region 1 the resulting object will
 * look like {"1": {"READ_REPORTS": true}}
 * @param {*} - user object
 * @returns {Object<string, {Object<string, bool>>}}
 */
export function userRegionalPermissions(user) {
  const regionalPermissions = REGIONS.reduce((acc, cur) => {
    acc[cur.number] = createScopeObject();
    return acc;
  }, {});

  if (!user.permissions) {
    return regionalPermissions;
  }

  user.permissions.filter((p) => (
    p.region !== 0
  )).forEach(({ region, scope }) => {
    regionalPermissions[region][scope] = true;
  });
  return regionalPermissions;
}

/**
 * This method returns an object representing the global permissions for the
 * user.
 *
 * If a user has SITE_ACCESS resulting object will look like {"SITE_ACCESS": true}
 * @param {*} - user object
 * @returns {Object<string, bool>>}
 */
export function userGlobalPermissions(user) {
  const globals = GLOBAL_SCOPES.reduce((acc, cur) => {
    acc[cur.name] = false;
    return acc;
  }, {});

  if (!user.permissions) {
    return globals;
  }

  user.permissions.filter((p) => (
    p.region === 0
  )).forEach(({ scope }) => {
    globals[scope] = true;
  });
  return globals;
}
