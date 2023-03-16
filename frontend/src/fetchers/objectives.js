/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { post } from './index';

const objectivesUrl = join('/', 'api', 'objectives');

export async function createObjectiveForOtherEntity(otherEntityIds, regionId) {
  const url = join(objectivesUrl, 'other-entity', 'new');

  const response = await post(url, { otherEntityIds, regionId });
  return response.json();
}
