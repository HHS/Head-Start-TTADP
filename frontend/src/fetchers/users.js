import join from 'url-join';
import { get, post } from './index';

export const getStateCodes = async () => {
  const res = await get(join('/', 'api', 'users', 'stateCodes'));
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
