import join from 'url-join';
import {
  get, HTTPError, post, put,
} from './index';

const standardGoalUrl = join('/', 'api', 'goal-templates', 'standard');

export const getStandardGoal = async (
  goalTemplateId,
  grantId,
  status,
) => {
  let url = join(
    standardGoalUrl,
    String(goalTemplateId),
    'grant',
    String(grantId),
  );

  if (status) {
    url += `?status=${status}`;
  }

  const response = await get(url);
  return response.json();
};

export const addStandardGoal = async (data) => {
  const {
    goalTemplateId,
    grantId,
    ...body
  } = data;

  const url = join(
    standardGoalUrl,
    String(data.goalTemplateId),
    'grant',
    String(data.grantId),
  );

  const response = await post(url, body);
  if (!response.ok) {
    throw new HTTPError(response.status, response.statusText);
  }
  return response.json();
};

export const updateStandardGoal = async (data) => {
  const {
    goalTemplateId,
    grantId,
    ...body
  } = data;

  const url = join(
    standardGoalUrl,
    String(data.goalTemplateId),
    'grant',
    String(data.grantId),
  );

  const response = await put(url, body);
  return response.json();
};
