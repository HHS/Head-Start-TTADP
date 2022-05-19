import {
  validateListOfResources,
  GOAL_NAME_ERROR,
  GOAL_DATE_ERROR,
} from '../../../../components/GoalForm/constants';

export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';
export const OBJECTIVE_TITLE = 'Every objective requires a title';
export const OBJECTIVE_ROLE = 'Every objective requires at least one role';
export const OBJECTIVE_RESOURCES = 'Each resource should be a valid link';
export const OBJECTIVE_TTA = 'Every objective should have TTA provided';
export const OBJECTIVE_TOPICS = 'Each objective should have a topic selected';

export const unfinishedObjectives = (objectives, setError = () => {}) => {
  const unfinished = objectives.some(
    (objective, index) => {
      let incomplete = false;
      if (!objective.title) {
        setError(`goalForEditing.objectives[${index}].title`, { message: OBJECTIVE_TITLE });
        incomplete = true;
      }

      if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
        setError(`goalForEditing.objectives[${index}].ttaProvided`, { message: OBJECTIVE_TTA });
        incomplete = true;
      }

      if (!objective.topics || !objective.topics.length) {
        setError(`goalForEditing.objectives[${index}].topics`, { message: OBJECTIVE_TOPICS });
        incomplete = true;
      }

      if (!objective.roles || !objective.roles.length) {
        setError(`goalForEditing.objectives[${index}].roles`, { message: OBJECTIVE_ROLE });
        incomplete = true;
      }

      if (!validateListOfResources(objective.resources)) {
        setError(`goalForEditing.objectives[${index}].resources`, { message: OBJECTIVE_RESOURCES });
        incomplete = true;
      }

      return incomplete;
    },
  );

  return unfinished ? UNFINISHED_OBJECTIVES : false;
};

export const unfinishedGoals = (goals, setError = () => {}) => {
  for (let i = 0; i < goals.length; i += 1) {
    const goal = goals[i];
    const endDateRequired = (goal.isNew);

    if (!goal.name) {
      setError('goalName', { message: GOAL_NAME_ERROR });
    }

    if (endDateRequired && !goal.endDate) {
      setError('goalEndDate', { message: GOAL_DATE_ERROR });
    }

    // Every goal must have an objective or the `goals` field has unfinished goals
    if (goal.objectives && goal.objectives.length > 0) {
      const objectivesUnfinished = unfinishedObjectives(goal.objectives, setError);
      if (objectivesUnfinished) {
        return objectivesUnfinished;
      }
    } else {
      setError('goalForEditing.objectives', { message: GOAL_MISSING_OBJECTIVE });
      return GOAL_MISSING_OBJECTIVE;
    }
  }
  return false;
};

export const validateGoals = (goals, setError = () => {}) => {
  if (goals.length < 1) {
    // setError();
    return GOALS_EMPTY;
  }

  const unfinishedMessage = unfinishedGoals(goals, setError);
  if (unfinishedMessage) {
    return unfinishedMessage;
  }
  return true;
};
