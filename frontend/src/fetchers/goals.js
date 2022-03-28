import join from 'url-join';
import { put } from './index';

const recipientUrl = join('/', 'api', 'goals');

// eslint-disable-next-line import/prefer-default-export
export const updateGoalStatus = async (
  goalId,
  regionId,
  oldStatus,
  newStatus,
  closeSuspendReason,
  closeSuspendContext,
) => {
  const recipientGoalsUrl = join(recipientUrl, goalId.toString(), 'changeStatus');
  const updatedGoal = await put(
    recipientGoalsUrl,
    {
      regionId,
      oldStatus,
      newStatus,
      closeSuspendReason,
      closeSuspendContext,
    },
  );
  return updatedGoal.json();
};
