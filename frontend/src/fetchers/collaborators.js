import join from 'url-join';
import { get } from './index';

// eslint-disable-next-line import/prefer-default-export
export const getCollaborators = async (region) => {
  const url = join('/', 'api', 'users', 'collaborators', `?region=${region}`);
  const collaborators = await get(url);
  return collaborators.json();
};
