import join from 'url-join';
import { get, put, post } from './index';

const activityReportUrl = join('/', 'api', 'files');

export const uploadFile = async (data) => {
  const res = await post(activityReportUrl, data);
  return res.json();
};