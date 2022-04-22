import {
  GOAL_DATE_ERROR,
} from '../../../../components/GoalForm/constants';

export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';
export const GOAL_NAME = 'Every goal must have a name';
export const OBJECTIVE_TITLE = 'Every objective requires a title';
export const OBJECTIVE_ROLE = 'Every objective requires at least one role';
export const OBJECTIVE_RESOURCES = 'Each resource should be a valid link';
export const OBJECTIVE_TTA = 'Every objective should have TTA provided';
export const OBJECTIVE_TOPICS = 'Each objective should have a topic selected';

export const GOAL_ERROR_INDEXES = {
  NAME: 0,
  END_DATE: 1,
  NO_OBJECTIVES: 2,
  OBJECTIVES: 3,
};

const GOAL_DEFAULT_ERRORS = Object.keys(GOAL_ERROR_INDEXES).map(() => false);

export const OBJECTIVE_ERROR_INDEXES = {
  TITLE: 0,
  ROLE: 1,
  RESOURCES: 2,
  TTA: 3,
  TOPICS: 4,
};

export const unfinishedObjectives = (objectives) => {
  // Every objective for this goal has to have a title and ttaProvided
  const unfinished = objectives.some(
    (objective) => {
      if (!objective.title) {
        return true;
      }

      if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
        return true;
      }

      if (!objective.topics.length) {
        return true;
      }

      if (!objective.resources.length) {
        return true;
      }

      if (!objective.roles.length) {
        return true;
      }

      return false;
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

export const validateGoal = (goal) => {
  const errors = [...GOAL_DEFAULT_ERRORS];
  let isValid = true;

  if (!goal || !goal.name) {
    errors[GOAL_ERROR_INDEXES.NAME] = GOALS_EMPTY;
    isValid = false;
    return [isValid, errors];
  }

  if (goal.isNew === 'new' && !goal.endDate) {
    errors[GOAL_ERROR_INDEXES.END_DATE] = GOAL_DATE_ERROR;
    isValid = false;
  }

  if (!goal.objectives.length) {
    errors[GOAL_ERROR_INDEXES.NO_OBJECTIVES] = GOAL_MISSING_OBJECTIVE;
    isValid = false;
  }

  const unfinished = unfinishedObjectives(goal.objectives);
  isValid = !unfinished && isValid;

  return [isValid, errors];
};

export const validateGoals = (goals) => {
  if (goals.length < 1) {
    return GOALS_EMPTY;
  }

  const error = goals.reduce((prev, goal) => {
    if (prev) {
      return prev;
    }

    const [isValid, errorMessages] = validateGoal(goal);
    if (!isValid) {
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < errorMessages.length; i++) {
        const e = errorMessages[i];
        if (e) {
          return e;
        }
      }
    }

    return prev;
  }, '');

  if (error) {
    return error;
  }

  return true;
};
