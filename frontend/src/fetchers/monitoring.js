import join from 'url-join';
import { get } from '.';

const monitoringUrl = join('/', 'api', 'monitoring');
const classUrl = join('/', 'api', 'monitoring', 'class');

export const getMonitoringData = async ({ grantNumber, recipientId, regionId }) => {
  const data = await get(
    join(
      monitoringUrl,
      `?recipientId=${recipientId}`,
      `&grantNumber=${grantNumber}`,
      `&regionId=${regionId}`,
    ),
  );

  console.log(data.json());

  return data.json();

  // return {
  //   reviewStatus: 'Compliant',
  //   reviewDate: '05/01/2023',
  //   reviewType: 'FA-2',
  // };
};

export const getClassScores = async ({ grantNumber, recipientId, regionId }) => {
  const scores = await get(
    join(
      classUrl,
      `?recipientId=${recipientId}`,
      `&grantNumber=${grantNumber}`,
      `&regionId=${regionId}`,
    ),
  );
  return scores.json();
  // return {
  //   received: '05/01/2023',
  //   ES: 6,
  //   CO: 3,
  //   IS: 7,
  // };
};
