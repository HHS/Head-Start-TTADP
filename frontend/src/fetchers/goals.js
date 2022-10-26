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

export async function deleteGoal(id, regionId) {
  const url = join(goalsUrl, id.toString());
  const deleted = await destroy(url, { regionId });
  return deleted.json();
}
