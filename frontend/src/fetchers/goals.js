import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';

const goalsUrl = join('/', 'api', 'goals');

export async function getGoalTemplateObjectiveOptions(reportId, goalTemplateId) {
  const url = join(goalsUrl, `?reportId=${reportId}&goalTemplateId=${goalTemplateId}`);
  const response = await get(url);
  return response.json();
}

export async function createGoalsFromTemplate(templateId, data) {
  const url = join(goalsUrl, 'template', String(templateId));
  const goals = await post(url, data);
  return goals.json();
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

export async function missingDataForActivityReport(regionId, goalIds) {
  const parameterizedGoalIds = goalIds.map((goalId) => `goalIds=${encodeURIComponent(goalId)}`).join('&');

  const url = join(
    goalsUrl,
    'region',
    String(regionId),
    'incomplete',
    `?${parameterizedGoalIds}`,
  );

  const response = await get(url);
  return response.json();
}

export async function reopenGoal(goalId, reason, context) {
  const url = join(goalsUrl, 'reopen');
  const response = await put(url, { goalId, reason, context });
  return response.json();
}
