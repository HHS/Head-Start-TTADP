import React from 'react';
import { determineMergeGoalStatus } from '@ttahub/common';
import PropTypes from 'prop-types';
import { goalPropTypes } from '../../../../../components/GoalCards/constants';
import GoalCard from './GoalCard';

function FinalGoalCard({
  selectedGoalIds,
  goals,
  finalGoalId,
}) {
  const final = goals.find((g) => g.id.toString() === finalGoalId);

  if (!final) {
    return null;
  }

  const mergedGoals = goals.filter(
    (g) => selectedGoalIds.includes(g.id.toString()) && g.id.toString() !== finalGoalId,
  );

  // combine objectives from all goals
  const combinedObjectives = [
    ...final.objectives,
    ...mergedGoals.map((g) => g.objectives).flat(),
  ];

  // sort objectives by last TTA
  combinedObjectives.sort((a, b) => {
    if (a.endDate < b.endDate) {
      return -1;
    }
    if (a.endDate > b.endDate) {
      return 1;
    }
    return 0;
  });

  // create an array of all goal statuses for comparison
  const mergedGoalStatuses = [...mergedGoals.map((g) => g.goalStatus), final.goalStatus];

  const status = determineMergeGoalStatus(mergedGoalStatuses);

  return (
    <>
      <GoalCard
        goal={{
          ...final,
          objectives: combinedObjectives,
          objectiveCount: combinedObjectives.length,
          goalStatus: status,
        }}
        final
      />
    </>
  );
}

FinalGoalCard.propTypes = {
  selectedGoalIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  goals: PropTypes.arrayOf(goalPropTypes).isRequired,
  finalGoalId: PropTypes.string,
};

FinalGoalCard.defaultProps = {
  finalGoalId: null,
};

export default FinalGoalCard;
