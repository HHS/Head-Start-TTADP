import join from 'url-join';
import { get, post } from './index';

const standardGoalUrl = join('/', 'api', 'goal-templates', 'standard');

export const getStandardGoal = async (
  goalTemplateId,
  grantId,
) => {
  const url = join(
    standardGoalUrl,
    String(goalTemplateId),
    'grant',
    String(grantId),
  );

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
  return response.json();
};

export const updateStandardGoal = () => {};
