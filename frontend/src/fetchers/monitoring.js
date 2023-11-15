import join from 'url-join';
import { get } from '.';

const monitoringUrl = join('/', 'api', 'monitoring');
const classUrl = join('/', 'api', 'monitoring', 'class');

export const getMonitoringReview = async (grantId) => {
  return {
    reviewStatus: 'Compliant',
    reviewDate: '05/01/2023',
    reviewType: 'FA-2',
  };
};

export const getClassScores = async (grantId) => {
  const scores = await get(join(classUrl, grantId));
  return scores.json();
  // return {
  //   received: '05/01/2023',
  //   ES: 6,
  //   CO: 3,
  //   IS: 7,
  // };
};
