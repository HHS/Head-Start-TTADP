/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { put } from '.';

const objectiveUrl = join('/', 'api', 'objectives');

export const updateObjectiveStatus = async (ids, regionId, status) => {
  const data = await put(
    objectiveUrl,
    {
      ids,
      regionId,
      status,
    },
  );

  return data.json();
};
