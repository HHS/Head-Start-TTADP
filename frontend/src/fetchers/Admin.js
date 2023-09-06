import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  get, put, post, destroy,
} from './index';

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

export const getSiteAlerts = async () => {
  const alerts = await get((join('/', 'api', 'admin', 'alerts')));
  return alerts.json();
};

export const saveSiteAlert = async (alert) => {
  const updatedAlert = await put((join('/', 'api', 'admin', 'alerts', String(alert.id))), alert);
  return updatedAlert.json();
};

export const deleteSiteAlert = async (alertId) => {
  const success = await destroy((join('/', 'api', 'admin', 'alerts', String(alertId))));
  return !!(success.ok);
};

export const createSiteAlert = async (alert) => {
  const createdAlert = await post((join('/', 'api', 'admin', 'alerts')), alert);
  return createdAlert.json();
};

export const setFeatureFlag = async (data) => {
  const result = await post((join('/', 'api', 'users', 'feature-flags')), data);
  return result;
};

export const getRedisInfo = async () => {
  const info = await get((join('/', 'api', 'admin', 'redis', 'info')));
  return info.json();
};

export const flushRedis = async () => {
  const result = await post((join('/', 'api', 'admin', 'redis', 'flush')));
  return result.json();
};

export const deleteNationalCenter = async (id) => {
  const result = await destroy((join('/', 'api', 'admin', 'national-center', String(id))));
  return result.json();
};

export const createNationalCenter = async (data) => {
  const result = await post((join('/', 'api', 'admin', 'national-center')), data);
  return result.json();
};

export const updateNationalCenter = async (id, data) => {
  const result = await put((join('/', 'api', 'admin', 'national-center', String(id))), data);
  return result.json();
};

export const sendEmail = async (data) => {
  const result = await post((join('/', 'api', 'admin', 'email')), data);
  return result.json();
};

export const importTrainingReports = async (data) => {
  const result = await post((join('/', 'api', 'admin', 'training-reports')), data);
  return result.json();
};