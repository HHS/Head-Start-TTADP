/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export const getSiteAlerts = async () => {
  const alerts = await get((join('/', 'api', 'alerts')));
  return alerts.json();
};
