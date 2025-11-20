import join from 'url-join';
import { get } from '.';

const monitoringUrl = join('/', 'api', 'monitoring');
const classUrl = join('/', 'api', 'monitoring', 'class');

export const getTtaByCitation = async (recipientId, regionId) => {
  const data = await get(
    join(
      monitoringUrl,
      String(recipientId),
      'region',
      String(regionId),
      'tta',
      'citation',
    ),
  );

  return data.json();
};

export const getTtaByReview = async (recipientId, regionId) => {
  const data = await get(
    join(
      monitoringUrl,
      String(recipientId),
      'region',
      String(regionId),
      'tta',
      'review',
    ),
  );

  return data.json();
};

export const getMonitoringData = async ({ grantNumber, recipientId, regionId }) => {
  const data = await get(
    join(
      monitoringUrl,
      String(recipientId),
      'region',
      String(regionId),
      'grant',
      String(grantNumber),
    ),
  );

  return data.json();
};

export const getClassScores = async ({ grantNumber, recipientId, regionId }) => {
  const data = await get(
    join(
      classUrl,
      String(recipientId),
      'region',
      String(regionId),
      'grant',
      String(grantNumber),
    ),
  );
  return data.json();
};
