import join from 'url-join';
import { get, put } from './index';

export const getUsers = async () => {
  const users = await get((join('/', 'api', 'admin', 'users')));
  return users.json();
};

export const updateUser = async (userId, data) => {
  const user = await put((join('/', 'api', 'admin', 'users', userId.toString(10))), data);
  return user.json();
};
