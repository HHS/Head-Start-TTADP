import { isEqual } from 'lodash';
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
        delete accumulator[current];
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

      let currentlyEditing = false;

      accumulator.goals = [
        (base.goalForEditing || null),
        ...(base.goals || []),
      ].filter((g) => g).map((goal) => ({
        ...goal,
        grantIds,
        isActivelyEdited: (() => {
          // we only want one to be currently editing, so if we've already set this variable,
          // then we return true
          if (currentlyEditing) {
            return false;
          }

          // otherwise, we if the goal has activityReportGoals, and any of them are actively edited
          // we affirm this as the case when we send it to the DB.
          if (goal.activityReportGoals
            && goal.activityReportGoals.some((arGoal) => arGoal.isActivelyEdited)
          ) {
            currentlyEditing = true;
          }

          return true;
        })(),
        prompts: goal.prompts || [],
      }));
    }

    if (!isEqual(base[current], object[current])) {
      accumulator[current] = object[current];
    }

    if (Number.isNaN(accumulator[current])) {
      delete accumulator[current];
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

export const packageGoals = (goals, goal, grantIds, prompts) => {
  const packagedGoals = [
    // we make sure to mark all the read only goals as "ActivelyEdited: false"
    ...goals.map((g) => ({
      goalIds: g.goalIds,
      status: g.status,
      endDate: g.endDate,
      onApprovedAR: g.onApprovedAR,
      name: g.name,
      grantIds,
      id: g.id,
      createdVia: g.createdVia,
      goalTemplateId: g.goalTemplateId,
      isActivelyBeingEditing: false,
      prompts: g.prompts || [],
      objectives: g.objectives.map((objective) => ({
        id: objective.id,
        ids: objective.ids,
        isNew: objective.isNew,
        ttaProvided: objective.ttaProvided,
        title: objective.title,
        status: objective.status,
        resources: objective.resources,
        topics: objective.topics,
        citations: objective.citations,
        files: objective.files,
        supportType: objective.supportType,
        courses: objective.courses,
        closeSuspendReason: objective.closeSuspendReason,
        closeSuspendContext: objective.closeSuspendContext,
        createdHere: objective.createdHere,
        // eslint-disable-next-line max-len
        goalId: g.id, // DO NOT REMOVE: This is required so we don't duplicate objectives when we update text on AR's.
      })),
    })),
  ];

  if (goal && goal.name) {
    packagedGoals.push({
      goalIds: goal.goalIds,
      status: goal.status,
      endDate: goal.endDate,
      onApprovedAR: goal.onApprovedAR,
      name: goal.name,
      createdVia: goal.createdVia,
      isActivelyBeingEditing: goal.isActivelyBeingEditing,
      goalTemplateId: goal.goalTemplateId,
      objectives: goal.objectives.map((objective) => ({
        id: objective.id,
        ids: objective.ids,
        isNew: objective.isNew,
        ttaProvided: objective.ttaProvided,
        title: objective.title,
        status: objective.status,
        resources: objective.resources,
        topics: objective.topics,
        citations: objective.citations,
        files: objective.files,
        supportType: objective.supportType,
        courses: objective.courses,
        closeSuspendReason: objective.closeSuspendReason,
        closeSuspendContext: objective.closeSuspendContext,
        createdHere: objective.createdHere,
        // eslint-disable-next-line max-len
        goalId: goal.id, // DO NOT REMOVE: This is required so we don't duplicate objectives when we update text on AR's.
      })),
      grantIds,
      prompts: prompts || [],
    });
  }

  return packagedGoals;
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
      prompts: goal.prompts || [],
    };
  } else {
    // otherwise we add it to the list of goals, formatting it with the correct
    // grant ids
    accumulatedData.goals.push({
      ...goal,
      grantIds,
      prompts: goal.prompts || [],
    });
  }

  return accumulatedData;
}, { goals: [], goalForEditing: null });

export const convertReportToFormData = (fetchedReport) => {
  let grantIds = [];
  if (fetchedReport.activityRecipients) {
    grantIds = fetchedReport.activityRecipients.map(({ id }) => id);
  }
  const activityRecipients = fetchedReport.activityRecipients.map((ar) => ({
    activityRecipientId: ar.id,
    name: ar.name,
    recipientIdForLookUp: ar.recipientIdForLookUp,
  }));

  const { goals, goalForEditing } = convertGoalsToFormData(
    fetchedReport.goalsAndObjectives, grantIds, fetchedReport.calculatedStatus,
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
  };
};

export const formatTitleForHtmlAttribute = (title) => (title ? title.replace(/\s/g, '-').toLowerCase() : '');
