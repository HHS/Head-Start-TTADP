import { isEqual } from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../Constants';
import {
  formatDateValueFromFormat,
  isValidForFormat,
} from '../../lib/dates';

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
      if (!object[current] || !isValidForFormat(object[current], 'MM/DD/YYYY')) {
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

/**
 * Extract goal IDs in their current display order to preserve user-arranged ordering
 *
 * PURPOSE: The backend returns goals ordered by createdAt (when they were added to the report),
 * but users want goals to stay in the order they arranged them. This function extracts goal IDs
 * from the packaged goals array to create an order array
 * that remembers the user's intended sequence.
 *
 * WHY NEEDED: When editing goals in place, we need to preserve their position even after
 * saving to the backend and navigating between pages.
 *
 * @param {Array} packagedGoals - The goals in their intended display order
 * @returns {Array} Array of goal IDs in order (e.g., [3, 1, 2] means goal 3 is first)
 *
 * EXAMPLE:
 * packagedGoals = [{id: 3, name: "Goal A"}, {id: 1, name: "Goal B"}, {id: 2, name: "Goal C"}]
 * Returns: [3, 1, 2] - preserving the display order regardless of IDs
 */
export const extractGoalIdsInOrder = (packagedGoals) => packagedGoals
  .map((g) => g.id)
  .filter((id) => id); // Filter out any undefined/null IDs (for new goals not yet saved)

export const packageGoals = (goals, goal, grantIds, prompts, originalIndex = null) => {
  const getUseIpdCoursesFlag = (objective) => objective.useIpdCourses
    ?? !!(objective.courses && objective.courses.length);
  const getUseFilesFlag = (objective) => objective.useFiles
    ?? !!(objective.files && objective.files.length);

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
        useIpdCourses: getUseIpdCoursesFlag(objective),
        useFiles: getUseFilesFlag(objective),
        closeSuspendReason: objective.closeSuspendReason,
        closeSuspendContext: objective.closeSuspendContext,
        createdHere: objective.createdHere,
        // eslint-disable-next-line max-len
        goalId: g.id, // DO NOT REMOVE: This is required so we don't duplicate objectives when we update text on AR's.
      })),
    })),
  ];

  if (goal && goal.name) {
    const goalToPackage = {
      goalIds: goal.goalIds,
      // IMPORTANT: Include id for goalOrder calculation
      // Without this, extractGoalIdsInOrder can't track which goal is which when the goal
      // being edited is packaged. This caused a bug where edited goals appeared at the
      // bottom of the list after saving.
      id: goal.id,
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
        useIpdCourses: getUseIpdCoursesFlag(objective),
        useFiles: getUseFilesFlag(objective),
        closeSuspendReason: objective.closeSuspendReason,
        closeSuspendContext: objective.closeSuspendContext,
        createdHere: objective.createdHere,
        // eslint-disable-next-line max-len
        goalId: goal.id, // DO NOT REMOVE: This is required so we don't duplicate objectives when we update text on AR's.
      })),
      grantIds,
      prompts: prompts || [],
    };

    // IN-PLACE EDITING: If originalIndex is provided, insert goal at that position
    // This is crucial for the "edit goals in place" feature - when a user edits a goal,
    // we temporarily remove it from the goals array and put it in goalForEditing.
    // When saving, we need to put it back at its ORIGINAL position (originalIndex),
    // not at the end of the array.
    //
    // EXAMPLE: If editing the 2nd goal out of 5:
    // - originalIndex = 1 (zero-based index)
    // - packagedGoals currently has 4 goals (the edited one was removed)
    // - We insert at position 1, putting it back where it was
    if (originalIndex !== null && originalIndex !== undefined && originalIndex >= 0) {
      const insertIndex = Math.min(originalIndex, packagedGoals.length);
      packagedGoals.splice(insertIndex, 0, goalToPackage);
    } else {
      // No originalIndex means this is a NEW goal, append to end
      packagedGoals.push(goalToPackage);
    }
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
  goals, grantIds, calculatedStatus = REPORT_STATUSES.DRAFT, goalOrder = null,
) => {
  const addUseIpdFlag = (objective = {}) => ({
    ...objective,
    useIpdCourses: objective.useIpdCourses ?? !!(objective.courses && objective.courses.length),
    useFiles: objective.useFiles ?? !!(objective.files && objective.files.length),
  });

  // GOAL ORDER RESTORATION: Re-sort goals to match user's intended order
  //
  // THE PROBLEM: Backend returns goals ordered by activityReportGoals.createdAt (when they
  // were first added to the report), but users want goals in the order they arranged them.
  //
  // THE SOLUTION: Before the backend saves goals, we calculate goalOrder (an array of IDs
  // in the correct order). When fetching goals back, we use goalOrder to re-sort them
  // to match the user's intended order.
  //
  // EXAMPLE:
  // - Backend returns: [Goal B (id:2, createdAt: older), Goal A (id:1, createdAt: newer)]
  // - goalOrder: [1, 2] (user wants Goal A first)
  // - After sorting: [Goal A (id:1), Goal B (id:2)] ✓
  let sortedGoals = goals;
  if (goalOrder && Array.isArray(goalOrder) && goalOrder.length > 0) {
    sortedGoals = [...goals].sort((a, b) => {
      const indexA = goalOrder.indexOf(a.id);
      const indexB = goalOrder.indexOf(b.id);
      // If goal not in goalOrder, put it at the end (shouldn't happen, but defensive)
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return sortedGoals.reduce((accumulatedData, goal, currentIndex) => {
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
        objectives: goal.objectives?.map(addUseIpdFlag) || [],
        prompts: goal.prompts || [],
        // Preserve the original index so the goal appears in the correct position
        // when editing in place, even after navigating away and returning
        originalIndex: currentIndex,
      };
    } else {
      // otherwise we add it to the list of goals, formatting it with the correct
      // grant ids
      accumulatedData.goals.push({
        ...goal,
        grantIds,
        prompts: goal.prompts || [],
        objectives: goal.objectives?.map(addUseIpdFlag) || [],
      });
    }

    return accumulatedData;
  }, { goals: [], goalForEditing: null });
};

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
    fetchedReport.goalsAndObjectives,
    grantIds,
    fetchedReport.calculatedStatus,
    fetchedReport.goalOrder,
  );

  const ECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.ECLKCResourcesUsed);
  const nonECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.nonECLKCResourcesUsed);
  const endDate = fetchedReport.endDate
    ? formatDateValueFromFormat(fetchedReport.endDate, DATEPICKER_VALUE_FORMAT, DATE_DISPLAY_FORMAT)
    : '';
  const startDate = fetchedReport.startDate
    ? formatDateValueFromFormat(
      fetchedReport.startDate,
      DATEPICKER_VALUE_FORMAT,
      DATE_DISPLAY_FORMAT,
    )
    : '';
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
