/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { put } from '.';

const objectiveUrl = join('/', 'api', 'objectives');

export const updateObjectiveStatus = async (ids, regionId, status) => {
  const data = await put(
    join(objectiveUrl, 'status'),
    {
      ids,
      regionId,
      status,
    },
  );

  return data.json();
};
