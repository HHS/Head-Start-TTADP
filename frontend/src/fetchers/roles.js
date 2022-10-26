/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export const getRoles = async () => {
  const roles = await get((join('/', 'api', 'role')));
  return roles.json();
};

export const getSpecialistRoles = async () => {
  const roles = await get((join('/', 'api', 'role', 'specialists')));
  return roles.json();
};
