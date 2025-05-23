/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import {
  get,
} from './index';

const goalTemplatesUrl = join('/', 'api', 'goal-templates');

export async function getGoalTemplates(grantIds) {
  const params = grantIds.map((grantId) => `grantIds=${grantId}`);
  const url = join(goalTemplatesUrl, `?${params.join('&')}`);
  const response = await get(url);
  return response.json();
}

export async function getGoalTemplatePrompts(templateId, goalIds = []) {
  const params = goalIds.map((goalId) => `goalIds=${goalId}`).join('&');
  const url = join(goalTemplatesUrl, String(templateId), 'prompts', `?${params}`);
  const response = await get(url);
  return response.json();
}

export async function getGoalTemplatePromptOptionsByName(name) {
  const url = join('/', 'api', 'goal-templates', 'options', `?name=${name}`);
  const response = await get(url);
  return response.json();
}
