import moment from 'moment';
import React from 'react';
import {
  COLLAB_REPORT_ACTIVITY_TYPES,
  COLLAB_REPORT_CONDUCT_METHODS,
  DATE_CONDITIONS,
  EMPTY_MULTI_SELECT,
  FILTER_CONDITIONS,
  REGION_CONDITIONS,
} from '../../Constants';
import { formatDateRange } from '../../utils';
import FilterCollabActivityMethod from './FilterCollabActivityMethod';
import FilterCollabActivityPurpose, {
  ACTIVITY_PURPOSE_OPTIONS,
} from './FilterCollabActivityPurpose';
import FilterCollabActivityType from './FilterCollabActivityType';
import FilterCollabGoal from './FilterCollabGoal';
import FilterCollabParticipant from './FilterCollabParticipant';
import FilterDateRange from './FilterDateRange';
import FilterRegionalSelect from './FilterRegionSelect';
import FilterStateSelect from './FilterStateSelect';
import { handleArrayQuery } from './helpers';

const EMPTY_SINGLE_SELECT = {
  is: '',
  'is not': '',
};

const handleStringQuery = (q) => q;

const conductMethodLabels = COLLAB_REPORT_CONDUCT_METHODS.reduce(
  (acc, { value, label }) => ({
    ...acc,
    [value]: label,
  }),
  {}
);

const ACTIVITY_PURPOSE_LABELS = ACTIVITY_PURPOSE_OPTIONS.reduce(
  (acc, { value, label }) => ({
    ...acc,
    [value]: label,
  }),
  {}
);

const ACTIVITY_TYPE_LABELS = COLLAB_REPORT_ACTIVITY_TYPES.reduce(
  (acc, { value, label }) => ({
    ...acc,
    [value]: label,
  }),
  {}
);

const handleLabelledQuery = (q, labels) => {
  if (!q?.length) {
    return '';
  }

  return [q]
    .flat()
    .map((value) => labels[value] || value)
    .join(', ');
};

const LAST_THIRTY_DAYS = formatDateRange({ lastThirtyDays: true, forDateTime: true });

const defaultDateValues = {
  is: LAST_THIRTY_DAYS,
  'is within': '',
  'is on or after': '',
  'is on or before': '',
};

export const fixQueryWhetherStringOrArray = (query) => {
  if (Array.isArray(query)) {
    return query.join(', ');
  }
  return query;
};

export const startDateFilter = {
  id: 'startDate',
  display: 'Date created',
  conditions: DATE_CONDITIONS,
  defaultValues: defaultDateValues,
  displayQuery: (query) => {
    // we need to handle array vs string case here

    const smushed = fixQueryWhetherStringOrArray(query);

    if (smushed.includes('-')) {
      return formatDateRange({
        string: smushed,
        withSpaces: false,
      });
    }
    return moment(smushed, 'YYYY/MM/DD').format('MM/DD/YYYY');
  },
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterDateRange
      condition={condition}
      query={query}
      updateSingleDate={onApplyQuery}
      onApplyDateRange={onApplyQuery}
    />
  ),
};

export const regionFilter = {
  id: 'region',
  display: 'Region',
  conditions: REGION_CONDITIONS,
  defaultValues: EMPTY_SINGLE_SELECT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterRegionalSelect appliedRegion={query} onApply={onApplyQuery} />
  ),
};

export const goalFilter = {
  id: 'goal',
  display: 'Supporting goals',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabGoal inputId={`goal-${condition}-${id}`} onApply={onApplyQuery} query={query} />
  ),
};

export const stateCodeFilter = {
  id: 'stateCode',
  display: 'State or territory',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterStateSelect inputId={`state-${condition}-${id}`} onApply={onApplyQuery} query={query} />
  ),
};

export const activityMethodFilter = {
  id: 'conductMethod',
  display: 'Activity method',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query) => handleLabelledQuery(query, conductMethodLabels),
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabActivityMethod
      inputId={`activity-method-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const activityPurposeFilter = {
  id: 'activityPurpose',
  display: 'Activity purpose',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query) => handleLabelledQuery(query, ACTIVITY_PURPOSE_LABELS),
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabActivityPurpose
      inputId={`activityPurpose-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const activityTypeFilter = {
  id: 'activityType',
  display: 'Activity type',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query) => handleLabelledQuery(query, ACTIVITY_TYPE_LABELS),
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabActivityType
      inputId={`activityType-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const participantFilter = {
  id: 'participants',
  display: 'Participants',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabParticipant
      inputId={`participants-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
