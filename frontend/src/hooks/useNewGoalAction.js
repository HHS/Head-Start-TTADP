import { useCallback } from 'react';
import { GOAL_STATUS } from '@ttahub/common';
import {
  updateGoalStatus,
  createGoalsFromTemplate,
  reopenGoal,
  createOrUpdateGoals,
} from '../fetchers/goals';

export default function useNewGoalAction() {
/**
 *
 * @param {number} recipientId
 * @param {number} regionId
 * @param {*} data
 * @returns {Promise<number[]>} goalIds
 */
  return useCallback(async (recipientId, regionId, data) => {
    const {
      useOhsInitiativeGoal,
      goalIds,
      goalStatus,
      selectedGrants,
      goalTemplate,
      goalName,
      reason,
      context,
      modalRef,
    } = data;

    if (goalStatus === GOAL_STATUS.CLOSED) {
      try {
        // reopen the goal(s) and redirect to the edit goal form for those goals
        const updatedGoals = await Promise.all(
          goalIds.map((id) => reopenGoal(id, reason, context)),
        );

        modalRef.current.toggleModal(false);
        return updatedGoals.map((g) => g.id);
      } catch (err) {
        modalRef.current.toggleModal(false);
        return [];
      }
    }

    if (goalStatus === GOAL_STATUS.SUSPENDED) {
      try {
        // reopen the goal(s) and redirect to the edit goal form for those goals
        const updatedGoals = await updateGoalStatus(
          goalIds,
          'In Progress',
          'Suspended',
          null,
          null,
        );

        return (updatedGoals.map((g) => g.id));
      } catch (err) {
        return [];
      }
    }

    if (useOhsInitiativeGoal) {
      if (goalTemplate) {
        try {
        // create goal from template (backend will check for existing)
        // and redirect to the edit goal form for that goal
          const createdGoals = await createGoalsFromTemplate(
            goalTemplate.id,
            {
              grants: selectedGrants.map((g) => g.id),
              regionId,
            },
          );

          return createdGoals;
        } catch (err) {
          return [];
        }
      }
    }

    // goal exists, is not closed or suspended
    if (goalIds && goalIds.length) {
      // we just redirect to the edit goal form for the goal
      return goalIds;
    }

    if (goalName) {
      // create goal from scratch
      try {
        const goals = await createOrUpdateGoals(
          selectedGrants.map((grant) => ({
            grantId: grant.id,
            name: goalName,
            status: GOAL_STATUS.NOT_STARTED,
            objectives: [],
            recipientId,
          })),
        );

        return goals.map((g) => g.id);
      } catch (err) {
        return [];
      }
    }

    // error state, will be caught by "forwardToGoalWithIds"
    return [];
  }, []);
}
