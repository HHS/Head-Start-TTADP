import join from 'url-join';
import { get, put } from './index';
import { DECIMAL_BASE } from '../Constants';

export const getUsers = async () => {
  const users = await get((join('/', 'api', 'admin', 'users')));
  return users.json();
};

export const updateUser = async (userId, data) => {
  const user = await put((join('/', 'api', 'admin', 'users', userId.toString(DECIMAL_BASE))), data);
  return user.json();
};

export const getCDIGrants = async (unassigned = true, active = true) => {
  const grants = await get((join('/', 'api', 'admin', 'grants', `cdi?unassigned=${unassigned}&active=${active}`)));
  return grants.json();
};

export const getGrantees = async () => {
  const grantees = await get(join('/', 'api', 'admin', 'grantees'));
  return grantees.json();
};

export const assignCDIGrant = async (grantId, regionId, granteeId) => {
  const body = {
    regionId,
    granteeId,
  };
  const grant = await put(join('/', 'api', 'admin', 'grants', 'cdi', grantId.toString(DECIMAL_BASE)), body);
  return grant.json();
};
