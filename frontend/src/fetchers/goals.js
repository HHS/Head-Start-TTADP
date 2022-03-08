import join from 'url-join';
import { put, post } from './index';

const goalsUrl = join('/', 'api', 'goals');

export async function createOrUpdateGoals(goalData) {
  const goal = await post(goalsUrl, goalData);
  return goal.json();
}

export async function updateGoalStatus(goalId, newStatus) {
  const statusUrl = join(goalsUrl, goalId.toString(), 'changeStatus');
  const updatedGoal = await put(statusUrl, { newStatus });
  return updatedGoal.json();
}
