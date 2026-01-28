import join from 'url-join';
import { get } from './index';

export const fetchLogout = async () => {
  try {
    await get(join('/', 'api', 'logout'));
  } catch (e) {
     
    console.log('error logging out, ignoring');
  }
};

export const fetchUser = async () => {
  const res = await get(join('/', 'api', 'user'));
  return res.json();
};
