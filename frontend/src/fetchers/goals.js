import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';

const goalsUrl = join('/', 'api', 'goals');

export async function goalsByIdsAndActivityReport(goalIds, reportId) {
  const params = goalIds.map((goalId) => `goalIds=${goalId}`);
  const url = join(goalsUrl, `?reportId=${reportId}&${params.join('&')}`);
  const response = await get(url);
  return response.json();
}

export async function createOrUpdateGoals(goals) {
  const data = {
    goals,
  };

  const goal = await post(goalsUrl, data);
  return goal.json();
}

export async function updateGoalStatus(
  goalIds,
  newStatus,
  oldStatus,
  closeSuspendReason,
  closeSuspendContext,
) {
  const recipientGoalsUrl = join(goalsUrl, 'changeStatus');
  const updatedGoal = await put(
    recipientGoalsUrl,
    {
      goalIds,
      oldStatus,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
    },
  );
  return updatedGoal.json();
}

export async function deleteGoal(goalIds, regionId) {
  const url = join(goalsUrl, `?${goalIds.map((id) => `goalIds=${id}`).join('&')}`);
  const deleted = await destroy(url, { regionId });
  return deleted.json();
}

export async function mergeGoals(
  selectedGoalIds,
  finalGoalId,
  recipientId,
  regionId,
  goalSimilarityGroupId,
) {
  const res = await post(join(
    goalsUrl,
    'recipient',
    String(recipientId),
    'region',
    String(regionId),
    'merge',
  ), {
    selectedGoalIds,
    finalGoalId,
    goalSimilarityGroupId,
  });
  return res.json();
}

export async function similarity(regionId, recipientId) {
  const url = join(
    goalsUrl,
    'similar',
    'region',
    String(regionId),
    'recipient',
    String(recipientId),
    '?cluster=true',
  );
  const response = await get(url);
  return response.json();
}

export async function similiarGoalsByText(
  regionId,
  recipientId,
  name,
  grantNumbers,
) {
  const parameterizedGrantNumbers = grantNumbers.map((grantNumber) => `grantNumbers=${encodeURIComponent(grantNumber)}`).join('&');
  const parameterizedGoalName = `name=${encodeURIComponent(name)}`;

  const url = join(
    goalsUrl,
    'recipient',
    String(recipientId),
    'region',
    String(regionId),
    'nudge',
    `?${parameterizedGoalName}&${parameterizedGrantNumbers}`,
  );

  const response = await get(url);
  return response.json();
}
