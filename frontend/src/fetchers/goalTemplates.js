/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import {
  get,
} from './index';

const goalTemplatesUrl = join('/', 'api', 'goal-templates');

export async function getGoalTemplates() {
  const url = join(goalTemplatesUrl);
  const response = await get(url);
  return response.json();
}
