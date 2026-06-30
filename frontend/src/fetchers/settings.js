import join from 'url-join';
import { get, put } from './index';

export const unsubscribe = async () => {
  await put(join('/', 'api', 'settings', 'email', 'unsubscribe'));
};

export const subscribe = async () => {
  await put(join('/', 'api', 'settings', 'email', 'subscribe'));
};

/**
 * @param {{key: string, value: string}[]} pairs
 */
export const updateSettings = async (pairs) => {
  await put(join('/', 'api', 'settings'), pairs);
};

/**
 * @returns {Promise<Array<{key: string, value: string}>>}
 */
export const getEmailSettings = async () => {
  const res = await get(join('/', 'api', 'settings', 'email'));
  return res.json();
};

/**
 * @returns {Promise<Array<{key: string, value: unknown}>>}
 */
export const getSettings = async () => {
  const res = await get(join('/', 'api', 'settings'));
  return res.json();
};
