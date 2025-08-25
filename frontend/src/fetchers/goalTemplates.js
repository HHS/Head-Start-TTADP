/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import {
  get,
} from './index';

const goalTemplatesUrl = join('/', 'api', 'goal-templates');

export async function getGoalTemplates(grantIds, includeClosedSuspended = false) {
  const params = grantIds.map((grantId) => `grantIds=${grantId}`);
  if (includeClosedSuspended) {
    params.push('includeClosedSuspendedGoals=true');
  }
  const url = join(goalTemplatesUrl, `?${params.join('&')}`);
  const response = await get(url);
  return response.json();
}

export async function getGoalTemplatePrompts(
  templateId,
  goalIds = [],
  isForActivityReport = false,
) {
  let params = goalIds.map((goalId) => `goalIds=${goalId}`).join('&');
  params = `${params}&isForActivityReport=${isForActivityReport}`;
  const url = join(goalTemplatesUrl, String(templateId), 'prompts', `?${params}`);
  const response = await get(url);
  return response.json();
}

export async function getGoalTemplatePromptOptionsByName(name) {
  const url = join('/', 'api', 'goal-templates', 'options', `?name=${name}`);
  const response = await get(url);
  return response.json();
}
