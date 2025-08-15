import join from 'url-join';
import { get } from './index';

export const getReports = async () => {
  const reports = await get('/api/collaboration-report');
  const json = await reports.json();
  return json;
};

export const getCollaborators = async (region) => {
  const url = join('/', 'api', 'users', 'collaborators', `?region=${region}`);
  const collaborators = await get(url);
  return collaborators.json();
};
