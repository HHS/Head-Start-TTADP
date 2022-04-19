import React from 'react';

export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';
export const GOALS_END_DATE = 'Every goal requires an anticipated close date';

const GOAL_ERROR_INDEXES = {
  NAME: 0,
  END_DATE: 1,
  NO_OBJECTIVES: 2,
  OBJECTIVES: 3,
};

const GOAL_DEFAULT_ERRORS = Object.keys(GOAL_ERROR_INDEXES).map(() => <></>);

const OBJECTIVE_ERROR_INDEXES = {
  TITLE: 0,
  ROLE: 1,
  RESOURCES: 2,
  TTA: 3,
};

const OBJECTIVE_DEFAULT_ERRORS = Object.keys(OBJECTIVE_ERROR_INDEXES).map(() => <></>);

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

export const validateObjectivesOnGoal = (goal) => {
  let isValid = true;

  const errors = goal.objectives.map((objective) => {
    const objectiveErrors = [...OBJECTIVE_DEFAULT_ERRORS];
    if (!objective.title) {
      isValid = false;
      objectiveErrors[OBJECTIVE_ERROR_INDEXES.TITLE] = 'Enter an objective title';
    }

    return objectiveErrors;
  });

  return [isValid, errors];
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

export const validateGoal = (goal) => {
  const errors = [...GOAL_DEFAULT_ERRORS];
  let isValid = true;

  if (!goal.name) {
    errors[GOAL_ERROR_INDEXES.NAME] = <span className="usa-error">{GOALS_EMPTY}</span>;
    isValid = false;
  }

  if (!goal.endDate) {
    errors[GOAL_ERROR_INDEXES.END_DATE] = <span className="usa-error">{GOALS_END_DATE}</span>;
    isValid = false;
  }

  if (!goal.objectives.length) {
    errors[GOAL_ERROR_INDEXES.NO_OBJECTIVES] = <span className="usa-error">{GOAL_MISSING_OBJECTIVE}</span>;
  }

  const [objectivesValid, objectiveErrors] = validateObjectivesOnGoal(goal);
  isValid = objectivesValid && isValid;

  errors[GOAL_ERROR_INDEXES.OBJECTIVES] = objectiveErrors;

  return [isValid, errors];
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
