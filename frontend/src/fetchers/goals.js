import join from 'url-join';
import { put, post, destroy } from './index';

const goalsUrl = join('/', 'api', 'goals');

export async function createOrUpdateGoals(goals) {
  const data = {
    goals,
  };

  const goal = await post(goalsUrl, data);
  return goal.json();
}

export async function updateGoalStatus(goalId, newStatus) {
  const statusUrl = join(goalsUrl, goalId.toString(), 'changeStatus');
  const updatedGoal = await put(statusUrl, { newStatus });
  return updatedGoal.json();
}

export async function deleteGoal(id, regionId) {
  const url = join(goalsUrl, id.toString());
  const deleted = await destroy(url, { regionId });
  return deleted.json();
}
