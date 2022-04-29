import { validateListOfResources } from '../../../../components/GoalForm/constants';

export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Every goal requires at least one objective';
export const GOALS_EMPTY = 'Every report must have at least one goal';
export const GOAL_NAME = 'Every goal must have a name';
export const OBJECTIVE_TITLE = 'Every objective requires a title';
export const OBJECTIVE_ROLE = 'Every objective requires at least one role';
export const OBJECTIVE_RESOURCES = 'Each resource should be a valid link';
export const OBJECTIVE_TTA = 'Every objective should have TTA provided';
export const OBJECTIVE_TOPICS = 'Each objective should have a topic selected';

export const unfinishedObjectives = (objectives, setError = () => {}) => {
  const unfinished = objectives.some(
    (objective, index) => {
      if (!objective.title) {
        setError(`goalForEditing.objectives[${index}].title`, { message: OBJECTIVE_TITLE });
        return true;
      }

      if (!objective.ttaProvided || objective.ttaProvided === '<p></p>') {
        setError(`goalForEditing.objectives[${index}].ttaProvided`, { message: OBJECTIVE_TTA });
        return true;
      }

      if (!objective.topics || !objective.topics.length) {
        setError(`goalForEditing.objectives[${index}].topics`, { message: OBJECTIVE_TOPICS });
        return true;
      }

      if (!objective.roles || !objective.roles.length) {
        setError(`goalForEditing.objectives[${index}].roles`, { message: OBJECTIVE_ROLE });
        return true;
      }

      if (!validateListOfResources(objective.resources)) {
        setError(`goalForEditing.objectives[${index}].resources`, { message: OBJECTIVE_RESOURCES });
        return true;
      }

      return false;
    },
  );

  return unfinished ? UNFINISHED_OBJECTIVES : false;
};

export const unfinishedGoals = (goals, setError = () => {}) => {
  for (let i = 0; i < goals.length; i += 1) {
    const goal = goals[i];

    // Every goal must have an objective or the `goals` field has unfinished goals
    if (goal.objectives && goal.objectives.length > 0) {
      const objectivesUnfinished = unfinishedObjectives(goal.objectives, setError);
      if (objectivesUnfinished) {
        return objectivesUnfinished;
      }
    } else {
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
