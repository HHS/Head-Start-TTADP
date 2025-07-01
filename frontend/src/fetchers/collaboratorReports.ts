import { get } from './index';

// eslint-disable-next-line import/prefer-default-export
export const getReports = async () => {
  const reports = await get('/collaboration-report');
  const json = await reports.json();
  return json;
};
