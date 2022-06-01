import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';

const goalsUrl = join('/', 'api', 'goals');

export async function goalById(goalId, recipientId) {
  const url = join(goalsUrl, goalId, 'recipient', recipientId);
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
  goalId,
  newStatus,
  oldStatus,
  closeSuspendReason,
  closeSuspendContext,
) {
  const recipientGoalsUrl = join(goalsUrl, goalId.toString(), 'changeStatus');
  const updatedGoal = await put(
    recipientGoalsUrl,
    {
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
