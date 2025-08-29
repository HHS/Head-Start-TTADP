import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../Constants';

const ALLOWED_STATUSES_FOR_GOAL_EDITING = [
  REPORT_STATUSES.DRAFT,
  REPORT_STATUSES.NEEDS_ACTION,
];

export const unflattenResourcesUsed = (array) => {
  if (!array) {
    return [];
  }

  return array.map((value) => ({ value }));
};

// this function takes goals returned from the API and parses them appropriately,
// setting the editable goal (or at least doing its best guess)
/**
 *
 * @param {goal[]} goals
 * @param {number[]} grantIds
 * @param {string} calculatedStatus
 * we need the calculated status to determine whether or not to set the goalForEditing
 * if we aren't editing, we need to make sure goals is populated so the review section
 * displays properly
 * @returns { goal[], goalForEditing }
 */
export const convertGoalsToFormData = (
  goals, grantIds, calculatedStatus = REPORT_STATUSES.DRAFT,
) => goals.reduce((accumulatedData, goal) => {
  // we are relying on the backend to have properly captured the goalForEditing
  // if there is some breakdown happening, and we have two set,
  // we will just fall back to just using the first matching goal
  if (
    // if any of the goals ids are included in the activelyEditedGoals id array
    goal.activityReportGoals
    && goal.activityReportGoals.some((arGoal) => arGoal.isActivelyEdited)
    && ALLOWED_STATUSES_FOR_GOAL_EDITING.includes(calculatedStatus)
    && !accumulatedData.goalForEditing) {
    // we set it as the goal for editing
    // eslint-disable-next-line no-param-reassign
    accumulatedData.goalForEditing = {
      ...goal,
      grantIds,
      objectives: goal.objectives,
      source: grantIds.length < 2 ? goal.source : '',
      prompts: grantIds.length < 2 ? goal.prompts : [],
    };
  } else {
    // otherwise we add it to the list of goals, formatting it with the correct
    // grant ids
    accumulatedData.goals.push({
      ...goal,
      grantIds,
      source: grantIds.length < 2 ? goal.source : '',
      prompts: grantIds.length < 2 ? goal.prompts : [],
    });
  }

  return accumulatedData;
}, { goals: [], goalForEditing: null });

const convertObjectivesWithoutGoalsToFormData = (
  objectives, recipientIds,
) => objectives.map((objective) => ({
  ...objective,
  recipientIds,
}));

export const convertReportToFormData = (fetchedReport) => {
  let grantIds = [];
  let otherEntities = [];

  const recipientIds = fetchedReport.activityRecipients.map(({ id }) => id);
  if (fetchedReport.activityRecipientType === 'recipient' && fetchedReport.activityRecipients) {
    grantIds = recipientIds;
  } else {
    otherEntities = recipientIds;
  }

  const { goals, goalForEditing } = convertGoalsToFormData(
    fetchedReport.goalsAndObjectives, grantIds, fetchedReport.calculatedStatus,
  );
  const objectivesWithoutGoals = convertObjectivesWithoutGoalsToFormData(
    fetchedReport.objectivesWithoutGoals, otherEntities,
  );
  const endDate = fetchedReport.endDate ? moment(fetchedReport.endDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
  const startDate = fetchedReport.startDate ? moment(fetchedReport.startDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';

  return {
    ...fetchedReport,
    goals,
    goalForEditing,
    objectivesWithoutGoals,
    endDate,
    startDate,
  };
};
