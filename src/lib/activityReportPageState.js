import moment from 'moment';
import { isValidResourceUrl } from '@ttahub/common';

const NOT_STARTED = 'Not started';
const IN_PROGRESS = 'In progress';
const COMPLETE = 'Complete';

function normalizeStatus(value) {
  return [COMPLETE, IN_PROGRESS, NOT_STARTED].includes(value)
    ? value
    : NOT_STARTED;
}

function isPositiveNumber(value) {
  if (value === null || value === undefined) {
    return false;
  }
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

function hasArrayValues(arr) {
  return Array.isArray(arr) && arr.some((item) => {
    if (typeof item === 'string') {
      return item.trim().length > 0;
    }
    if (item && typeof item === 'object') {
      return Object.keys(item).length > 0;
    }
    return item !== null && item !== undefined;
  });
}

function isValidDate(value) {
  if (!value) {
    return false;
  }
  return moment(value).isValid();
}

function stripHtml(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function areResourcesValid(resources = []) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return true;
  }

  const trimmed = resources
    .map((resource) => {
      if (!resource) {
        return '';
      }
      if (typeof resource === 'string') {
        return resource.trim();
      }
      if (resource.value) {
        return `${resource.value}`.trim();
      }
      if (resource.url) {
        return `${resource.url}`.trim();
      }
      if (resource.resource && resource.resource.value) {
        return `${resource.resource.value}`.trim();
      }
      return '';
    })
    .filter((value) => value.length > 0);

  if (trimmed.length === 0) {
    return true;
  }

  return trimmed.every((value) => isValidResourceUrl(value));
}

function objectivesComplete(objectives = []) {
  if (!Array.isArray(objectives) || objectives.length === 0) {
    return false;
  }

  return objectives.every((objective) => {
    const title = (objective?.title || '').trim();
    const ttaProvided = stripHtml(objective?.ttaProvided || '');
    const topics = objective?.topics || [];
    const supportType = objective?.supportType || null;

    if (!title || !ttaProvided || !hasArrayValues(topics) || !supportType) {
      return false;
    }

    return areResourcesValid(objective?.resources || []);
  });
}

function computeSummaryStatus(report) {
  const {
    activityRecipientType,
    deliveryMethod,
    activityReason,
    activityRecipients,
    targetPopulations,
    ttaType,
    participants,
    language,
    duration,
    numberOfParticipants,
    numberOfParticipantsInPerson,
    numberOfParticipantsVirtually,
    startDate,
    endDate,
  } = report;

  const strings = [
    activityRecipientType,
    deliveryMethod,
    activityReason,
  ];

  const arrays = [
    activityRecipients,
    targetPopulations,
    ttaType,
    participants,
    language,
  ];

  const numbers = [
    duration,
  ];

  let participantsValid = false;
  if (deliveryMethod === 'hybrid') {
    participantsValid = [
      numberOfParticipantsInPerson,
      numberOfParticipantsVirtually,
    ].every((value) => isPositiveNumber(value));
  } else {
    participantsValid = isPositiveNumber(numberOfParticipants);
  }

  const datesValid = isValidDate(startDate) && isValidDate(endDate);

  const stringsComplete = strings.every((value) => value && `${value}`.trim().length > 0);
  const arraysComplete = arrays.every((arr) => hasArrayValues(arr));
  const numbersComplete = numbers.every((value) => isPositiveNumber(value));

  const isComplete = stringsComplete
    && arraysComplete
    && numbersComplete
    && participantsValid
    && datesValid;

  if (isComplete) {
    return COMPLETE;
  }

  const hasProgress = [
    ...strings,
    ...arrays,
    duration,
    numberOfParticipants,
    numberOfParticipantsInPerson,
    numberOfParticipantsVirtually,
    startDate,
    endDate,
  ].some((value) => {
    if (Array.isArray(value)) {
      return hasArrayValues(value);
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  });

  return hasProgress ? IN_PROGRESS : NOT_STARTED;
}

function computeGoalsStatus(report) {
  const goals = Array.isArray(report.goalsAndObjectives) ? report.goalsAndObjectives : [];
  const objectivesWithoutGoals = Array.isArray(report.objectivesWithoutGoals)
    ? report.objectivesWithoutGoals
    : [];

  const hasGoals = goals.length > 0;
  const hasOtherObjectives = objectivesWithoutGoals.length > 0;

  const goalsAreComplete = hasGoals
    ? goals.every((goal) => objectivesComplete(goal.objectives || []))
    : false;

  const otherObjectivesComplete = hasOtherObjectives
    ? objectivesComplete(objectivesWithoutGoals)
    : false;

  const hasData = hasGoals || hasOtherObjectives;

  const allComplete = hasData
    && (hasGoals ? goalsAreComplete : true)
    && (hasOtherObjectives ? otherObjectivesComplete : true);

  if (allComplete) {
    return COMPLETE;
  }

  return hasData ? IN_PROGRESS : NOT_STARTED;
}

function computeNextStepsStatus(report) {
  const specialistNextSteps = Array.isArray(report.specialistNextSteps)
    ? report.specialistNextSteps
    : [];
  const recipientNextSteps = Array.isArray(report.recipientNextSteps)
    ? report.recipientNextSteps
    : [];

  const flattenSteps = (steps) => steps
    .map((step) => (step?.note !== undefined || step?.completeDate !== undefined
      ? step
      : step?.dataValues || {}))
    .filter((step) => step && (step.note || step.completeDate));

  const specialistSteps = flattenSteps(specialistNextSteps);
  const recipientSteps = flattenSteps(recipientNextSteps);

  const combined = [...specialistSteps, ...recipientSteps];
  const hasData = combined.length > 0;

  const allComplete = hasData && combined.every((step) => {
    const note = (step.note || '').trim();
    return note.length > 0 && isValidDate(step.completeDate);
  });

  if (allComplete) {
    return COMPLETE;
  }

  return hasData ? IN_PROGRESS : NOT_STARTED;
}

function computeAttachmentsStatus(incomingStatus) {
  return normalizeStatus(incomingStatus);
}

export function sanitizeActivityReportPageState(report, incomingPageState = {}) {
  const summaryStatus = computeSummaryStatus(report);
  const goalsStatus = computeGoalsStatus(report);
  const nextStepsStatus = computeNextStepsStatus(report);
  const attachmentsStatus = computeAttachmentsStatus(incomingPageState['3']);

  return {
    1: summaryStatus,
    2: goalsStatus,
    3: attachmentsStatus,
    4: nextStepsStatus,
  };
}

export default sanitizeActivityReportPageState;
