import join from 'url-join';
import { get } from '.';

const monitoringUrl = join('/', 'api', 'monitoring');
const classUrl = join('/', 'api', 'monitoring', 'class');

export const getMonitoringData = async ({ grantNumber, recipientId, regionId }) => {
  const data = await get(
    join(
      monitoringUrl,
      recipientId,
      'region',
      regionId,
      'grant',
      grantNumber,
    ),
  );

  return data.json();
};

export const getClassScores = async ({ grantNumber, recipientId, regionId }) => {
  const data = await get(
    join(
      classUrl,
      recipientId,
      'region',
      regionId,
      'grant',
      grantNumber,
    ),
  );
  return data.json();
};
