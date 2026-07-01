import join from 'url-join';
import { filtersToQueryString } from '../utils';
import { get, put } from './index';
import { getSortConfigParams } from './utils';

const notificationsUrl = join('/', 'api', 'notifications');

export const fetchNotifications = async ({ sortConfig = {} } = {}, filters = []) => {
  const sortParams = getSortConfigParams(sortConfig);
  const filterParams = filters ? filtersToQueryString(filters) : '';
  const qs = [sortParams.toString(), filterParams].filter(Boolean).join('&');
  const response = await get(`${notificationsUrl}?${qs}`);
  return response.json();
};

export const fetchArchivedNotifications = async ({ sortConfig = {} } = {}, filters = []) => {
  const sortParams = getSortConfigParams(sortConfig);
  const filterParams = filters ? filtersToQueryString(filters) : '';
  const qs = [sortParams.toString(), filterParams].filter(Boolean).join('&');
  const response = await get(join(notificationsUrl, 'archived', `?${qs}`));
  return response.json();
};

export const archiveNotification = async (notificationId) => {
  const response = await put(join(notificationsUrl, notificationId), {
    archivedAt: new Date().toISOString(),
  });
  return response.json();
};

export const viewNotification = async (notificationId) => {
  const response = await put(join(notificationsUrl, notificationId), {
    viewedAt: new Date().toISOString(),
  });
  return response.json();
};
