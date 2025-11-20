import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DECIMAL_BASE, DISALLOWED_URLS, isValidResourceUrl } from '@ttahub/common';
import { OBJECTIVE_STATUS } from '../../Constants';

export const noDisallowedUrls = (value) => {
  const urls = value.map((v) => v.value);
  const disallowedUrl = DISALLOWED_URLS.find((disallowed) => urls.includes(disallowed.url));
  return disallowedUrl ? disallowedUrl.error : true;
};

export const objectivesWithValidResourcesOnly = (objectives) => {
  if (!objectives) {
    return [];
  }

  return objectives.map((objective) => ({
    ...objective,
    resources: objective.resources
      .map((r) => ({ ...r, value: r.value.trim() }))
      .filter((resource) => isValidResourceUrl(resource.value)),
  }));
};

export const GOAL_NAME_ERROR = 'Enter the recipient\'s goal';
export const GOAL_DATE_ERROR = 'Enter a valid date';
export const SELECT_GRANTS_ERROR = 'Select at least one recipient grant number';
export const OBJECTIVES_EMPTY = 'Every report must have at least one objective';
export const GOAL_SOURCE_ERROR = 'Select a valid source';

export const FORM_FIELD_INDEXES = {
  GRANTS: 0,
  NAME: 1,
  GOAL_SOURCES: 2,
  OBJECTIVES_EMPTY: 3,
  OBJECTIVES: 4,
  GOAL_PROMPTS: 5,
};

export const FORM_FIELD_DEFAULT_ERRORS = [<></>, <></>, <></>, <></>, [], {}];

export const OBJECTIVE_DEFAULTS = (l) => ({
  title: '',
  topics: [],
  resources: [{ key: uuidv4(), value: '' }],
  id: `new-${l}`,
  status: OBJECTIVE_STATUS.NOT_STARTED,
  isNew: true,
  closeSuspendReason: null,
  closeSuspendContext: null,
  supportType: '',
});

export const OBJECTIVE_FORM_FIELD_INDEXES = {
  TITLE: 0,
  TOPICS: 1,
  RESOURCES: 2,
  STATUS: 3,
  STATUS_SUSPEND_REASON: 4,
  SUPPORT_TYPE: 5,
};

export const OBJECTIVE_DEFAULT_ERRORS = [<></>, <></>, <></>, <></>, <></>, <></>];

export const TTA_OBJECTIVE_ERROR = 'Enter the TTA objective';
export const OBJECTIVE_TOPIC_ERROR = 'Select at least one topic';
export const OBJECTIVE_LINK_ERROR = (
  <span className="usa-error-message">
    Enter one resource per field. Valid resource links must start with http:// or https://
  </span>
);
export const OBJECTIVE_STATUS_ERROR = 'Select a status';
export const OBJECTIVE_SUPPORT_TYPE_ERROR = 'Select a support type';

export const OBJECTIVE_ERROR_MESSAGES = [
  TTA_OBJECTIVE_ERROR,
  OBJECTIVE_TOPIC_ERROR,
  OBJECTIVE_LINK_ERROR,
  OBJECTIVE_SUPPORT_TYPE_ERROR,
  OBJECTIVE_STATUS_ERROR,
];

export const validateListOfResources = (resources = []) => {
  if (resources.length > 1 || (resources.length === 1 && resources[0].value)) {
    const allValidResources = resources.reduce((a, c) => {
      if (a && c.value) {
        return isValidResourceUrl(c.value);
      }

      return a;
    }, true);

    return allValidResources;
  }

  return true;
};

export const dismissOnNoMatch = (event, selector, dismiss) => {
  if (!event.relatedTarget || !event.relatedTarget.matches(selector)) {
    dismiss(true);
  }
};

export const grantsToGoals = ({
  selectedGrants,
  name,
  status,
  source,
  isCurated,
  regionId,
  recipient,
  objectives,
  ids,
  prompts,
}) => selectedGrants.map((g) => {
  const goalSource = source ? source[g.numberWithProgramTypes] : '';
  const goalPrompts = prompts ? prompts[g.numberWithProgramTypes] : [];
  return {
    grantId: g.id,
    name,
    status,
    source: goalSource || null,
    isCurated,
    regionId: parseInt(regionId, DECIMAL_BASE),
    recipientId: recipient.id,
    objectives,
    ids,
    prompts: goalPrompts,
  };
});
