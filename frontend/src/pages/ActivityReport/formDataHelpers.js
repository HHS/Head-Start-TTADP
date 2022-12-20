import { isEqual } from 'lodash';
import moment from 'moment';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
  REPORT_STATUSES,
} from '../../Constants';

const ALLOWED_STATUSES_FOR_GOAL_EDITING = [
  REPORT_STATUSES.DRAFT,
  REPORT_STATUSES.NEEDS_ACTION,
];

/**
 * compares two objects using lodash "isEqual" and returns the difference
 * @param {*} object
 * @param {*} base
 * @returns {} containing any new keys/values
 */
export const findWhatsChanged = (object, base) => {
  function reduction(accumulator, current) {
    if (current === 'startDate' || current === 'endDate') {
      if (!object[current] || !moment(object[current], 'MM/DD/YYYY').isValid()) {
        accumulator[current] = null;
        return accumulator;
      }
    }

    if (current === 'creatorRole' && !object[current]) {
      accumulator[current] = null;
      return accumulator;
    }

    // this block intends to fix an issue where multi recipients are removed from a report
    // after goals have been saved we pass up the removed recipients so that their specific links
    // to the activity report/goals will be severed on the backend
    if (current === 'activityRecipients' && !isEqual(base[current], object[current])) {
      // eslint-disable-next-line max-len
      const grantIds = object.activityRecipients.map((activityRecipient) => activityRecipient.activityRecipientId);
      // eslint-disable-next-line max-len
      accumulator.recipientsWhoHaveGoalsThatShouldBeRemoved = base.activityRecipients.filter((baseData) => (
        !grantIds.includes(baseData.activityRecipientId)
      )).map((activityRecipient) => activityRecipient.activityRecipientId);

      // if we change activity recipients we should always ship the goals up as well
      // we do hit recipients first, so if they were somehow both changed before the API was hit
      // (unlikely since they are on different parts of the form)
      // the goals that were changed would overwrite the next line
      accumulator.goals = base.goals.map((goal) => ({ ...goal, grantIds }));
    }

    if (!isEqual(base[current], object[current])) {
      accumulator[current] = object[current];
    }

    return accumulator;
  }

  // we sort these so they traverse in a particular order
  // (ActivityRecipients before goals, in particular)
  return Object.keys(object).sort().reduce(reduction, {});
};

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
    && goal.activityReportGoals.some((arGoal) => arGoal.isActivelyEdited
    && ALLOWED_STATUSES_FOR_GOAL_EDITING.includes(calculatedStatus)
    && !accumulatedData.goalForEditing)
  ) {
    // we set it as the goal for editing
    // eslint-disable-next-line no-param-reassign
    accumulatedData.goalForEditing = { ...goal, grantIds, objectives: goal.objectives };
  } else {
    // otherwise we add it to the list of goals, formatting it with the correct
    // grant ids
    accumulatedData.goals.push({ ...goal, grantIds });
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
  if (fetchedReport.activityRecipientType === 'recipient' && fetchedReport.activityRecipients) {
    grantIds = fetchedReport.activityRecipients.map(({ id }) => id);
  } else {
    otherEntities = fetchedReport.activityRecipients.map(({ id }) => id);
  }

  const activityRecipients = fetchedReport.activityRecipients.map((ar) => ({
    activityRecipientId: ar.id,
    name: ar.name,
  }));

  const { goals, goalForEditing } = convertGoalsToFormData(
    fetchedReport.goalsAndObjectives, grantIds, fetchedReport.calculatedStatus,
  );
  const objectivesWithoutGoals = convertObjectivesWithoutGoalsToFormData(
    fetchedReport.objectivesWithoutGoals, otherEntities,
  );
  const ECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.ECLKCResourcesUsed);
  const nonECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.nonECLKCResourcesUsed);
  const endDate = fetchedReport.endDate ? moment(fetchedReport.endDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
  const startDate = fetchedReport.startDate ? moment(fetchedReport.startDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
  return {
    ...fetchedReport,
    activityRecipients,
    ECLKCResourcesUsed,
    nonECLKCResourcesUsed,
    goals,
    goalForEditing,
    endDate,
    startDate,
    objectivesWithoutGoals,
  };
};
