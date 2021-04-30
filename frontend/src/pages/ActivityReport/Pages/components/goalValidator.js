export const UNFINISHED_OBJECTIVES = 'Every objective must have both a title and TTA provided';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';

export const unfinishedObjectives = (objectives) => {
  // Every objective for this goal has to have a title and ttaProvided
  const unfinished = objectives.some(
    (objective) => !(objective.title && objective.ttaProvided),
  );
  return unfinished ? UNFINISHED_OBJECTIVES : false;
};

export const unfinishedGoals = (goals) => {
  for (let i = 0; i < goals.length; i += 1) {
    const goal = goals[i];
    // Every goal must have an objective or the `goals` field has unfinished goals
    if (goal.objectives && goal.objectives.length > 0) {
      const objectivesUnfinished = unfinishedObjectives(goal.objectives);
      if (objectivesUnfinished) {
        return objectivesUnfinished;
      }
    } else {
      return GOAL_MISSING_OBJECTIVE;
    }
  }
  return false;
};

export const validateGoals = (goals) => {
  if (goals.length < 1) {
    return GOALS_EMPTY;
  }

  const unfinishedMessage = unfinishedGoals(goals);
  if (unfinishedMessage) {
    return unfinishedMessage;
  }
  return true;
};
