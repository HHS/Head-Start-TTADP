/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

export const getRoles = async (onlySpecialist = false) => {
  const roles = await get((join('/', 'api', 'role', `?onlySpecialist=${onlySpecialist}`)));
  return roles.json();
};
