import join from 'url-join';
import { get, put } from './index';
import { DECIMAL_BASE } from '../Constants';

export const getUsers = async () => {
  const users = await get((join('/', 'api', 'admin', 'users')));
  return users.json();
};

export const getFeatures = async () => {
  const features = await get((join('/', 'api', 'admin', 'users', 'features')));
  return features.json();
};

export const updateUser = async (userId, data) => {
  const user = await put((join('/', 'api', 'admin', 'users', userId.toString(DECIMAL_BASE))), data);
  return user.json();
};

export const getCDIGrants = async (unassigned = true, active = true) => {
  const grants = await get((join('/', 'api', 'admin', 'grants', `cdi?unassigned=${unassigned}&active=${active}`)));
  return grants.json();
};

export const getRecipients = async () => {
  const recipients = await get(join('/', 'api', 'admin', 'recipients'));
  return recipients.json();
};

export const assignCDIGrant = async (grantId, regionId, recipientId) => {
  const body = {
    regionId,
    recipientId,
  };
  const grant = await put(join('/', 'api', 'admin', 'grants', 'cdi', grantId.toString(DECIMAL_BASE)), body);
  return grant.json();
};

export const getRoles = async () => {
  const roles = await get((join('/', 'api', 'admin', 'roles')));
  return roles.json();
};

export const saveRoles = async (roles) => {
  const updatedRoles = await put((join('/', 'api', 'admin', 'roles')), { roles });
  return updatedRoles.json();
};
