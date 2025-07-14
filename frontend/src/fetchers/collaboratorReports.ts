import { get } from './index';

const getReports = async () => {
  const reports = await get('/api/collaboration-report');
  const json = await reports.json();
  return json;
};

export default getReports;
