import join from 'url-join';
import { get } from './index';

export const fetchLogout = async () => {
  await get(join('/', 'api', 'logout'));
};

export const fetchUser = async () => {
  const res = await get(join('/', 'api', 'user'));
  return res.json();
};
