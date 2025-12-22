import {
  validateListOfResources,
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NOOP } from '../../../../Constants';

export const UNFINISHED_OBJECTIVES = 'All objective fields must be completed';
export const GOAL_MISSING_OBJECTIVE = 'Select a TTA objective';
export const GOALS_EMPTY = 'Select a recipent\'s goal';
export const OBJECTIVE_TITLE = 'Enter an objective';
export const OBJECTIVE_ROLE = 'Select a specialist role';
export const OBJECTIVE_RESOURCES = 'Each resource should be a valid link. Invalid resources will not be saved.';
export const OBJECTIVE_TTA = 'Describe the TTA provided';
export const OBJECTIVE_TOPICS = 'Select at least one topic';
export const OBJECTIVE_CITATIONS = 'Select at least one citation';
export const OBJECTIVE_COURSES = 'Select at least one course';
export const OBJECTIVE_FILES = 'Upload at least one file';

/**
 * Function to validate a single value based on a user's flags
 * defaults to a boolean validator
 * if the user does not have the flag, the value is considered valid
 *
 * @param {object} user
 * @param {string} flag
 * @param {string | number} value
 * @param {function} validator
 * @returns boolean
 */
export const validateOnlyWithFlag = (
  user,
  flag,
  value,
  validator = Boolean,
) => {
  if (user.flags && user.flags.includes(flag)) {
    return validator(value);
  }
  return true;
};

export const unfinishedObjectives = (
  objectives,
  setError = () => {},
  fieldArrayName = 'goalForEditing.objectives',
  isMonitoringGoal = false,
) => {
  const unfinished = objectives.some(
    (objective, index) => {
      let incomplete = false;
      if (!objective.title) {
        setError(`${fieldArrayName}[${index}].title`, { message: OBJECTIVE_TITLE });
        incomplete = true;
      }

      if (!objective.ttaProvided || objective.ttaProvided === '<p></p>' || objective.ttaProvided === '<p></p>\n') {
        setError(`${fieldArrayName}[${index}].ttaProvided`, { message: OBJECTIVE_TTA });
        incomplete = true;
      }

      if (!objective.topics || !objective.topics.length) {
        setError(`${fieldArrayName}[${index}].topics`, { message: OBJECTIVE_TOPICS });
        incomplete = true;
      }

      // We only validate citations if they exist (they are not always required).
      if (isMonitoringGoal && (!objective.citations
        || (objective.citations && !objective.citations.length))) {
        setError(`${fieldArrayName}[${index}].citations`, { message: OBJECTIVE_CITATIONS });
        incomplete = true;
      }

      if (!objective.resources || !validateListOfResources(objective.resources)) {
        setError(`${fieldArrayName}[${index}].resources`, { message: OBJECTIVE_RESOURCES });
        incomplete = true;
      }

      if (!objective.supportType) {
        setError(
          `${fieldArrayName}[${index}].supportType`,
          { message: 'Select a support type' },
        );
        incomplete = true;
      }

      if (objective.useIpdCourses && (!objective.courses || !objective.courses.length)) {
        setError(`${fieldArrayName}[${index}].courses`, { message: OBJECTIVE_COURSES });
        incomplete = true;
      }

      if (objective.useFiles && (!objective.files || !objective.files.length)) {
        setError(`${fieldArrayName}[${index}].files`, { message: OBJECTIVE_FILES });
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

    if (!goal.name) {
      setError('goalName', { message: GOAL_NAME_ERROR });
      return GOAL_NAME_ERROR;
    }

    // Every goal must have an objective or the `goals` field has unfinished goals
    if (goal.objectives && goal.objectives.length > 0) {
      const isMonitoringGoal = goal.standard === 'Monitoring';
      const objectivesUnfinished = unfinishedObjectives(goal.objectives, setError, 'goalForEditing.objectives', isMonitoringGoal);
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

export const validateGoals = (goals, setError = NOOP) => {
  if (!goals || goals.length < 1) {
    return GOALS_EMPTY;
  }

  const unfinishedMessage = unfinishedGoals(goals, setError);
  if (unfinishedMessage) {
    return unfinishedMessage;
  }
  return true;
};

export const validatePrompts = async (promptTitles, trigger) => {
  // attempt to validate prompts
  if (promptTitles && promptTitles.length) {
    const outputs = await Promise.all((promptTitles.map((title) => trigger(title.fieldName))));
    if (outputs.some((output) => output === false)) {
      return false;
    }
  }

  return true;
};
