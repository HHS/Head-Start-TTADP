import join from 'url-join';
import { get, post } from './index';

export const getStateCodes = async () => {
  const res = await get(join('/', 'api', 'users', 'stateCodes'));
  return res.json();
};

export const getNamesByIds = async (ids) => {
  const query = ids.map((id) => `ids=${id}`).join('&');
  const res = await get(join('/', 'api', 'users', 'names', `?${query}`));
  return res.json();
};

export const getActiveUsers = async () => {
  const res = await get(join('/', 'api', 'users', 'active-users'));
  return res.blob();
};

export const getTrainingReportUsers = async (regionId, eventId) => {
  const res = await get(join('/', 'api', 'users', 'training-report-users', `?regionId=${String(regionId)}&eventId=${String(eventId)}`));
  return res.json();
};

export const requestVerificationEmail = async () => post(join('/', 'api', 'users', 'send-verification-email'));

export const verifyEmailToken = async (token) => {
  await post(join('/', 'api', 'users', 'verify-email', token));
};

export const getStatistics = async () => {
  const res = await get(join('/', 'api', 'users', 'statistics'));
  return res.json();
};

export const getRegionalTrainerOptions = async (regionId) => {
  const res = await get(join('/', 'api', 'users', 'trainers', 'regional', 'region', regionId));
  return res.json();
};

export const getNationalCenterTrainerOptions = async (regionId) => {
  const res = await get(join('/', 'api', 'users', 'trainers', 'national-center', 'region', regionId));
  return res.json();
};
