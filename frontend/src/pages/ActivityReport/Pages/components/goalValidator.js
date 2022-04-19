export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';

export const unfinishedObjectives = (objectives) => {
  // Every objective for this goal has to have a title and ttaProvided
  const unfinished = objectives.some(
    (objective) => {
      if (!objective.title) {
        return false;
      }

      if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
        return false;
      }

      if (!objective.topics.length) {
        return false;
      }

      return true;
    },
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
