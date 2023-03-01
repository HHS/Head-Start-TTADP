/* eslint-disable import/prefer-default-export */
import React from 'react';
import moment from 'moment';
import { formatDateRange } from '../../utils';
import {
  DATE_CONDITIONS,
  FILTER_CONDITIONS,
} from '../../Constants';
import FilterDateRange from './FilterDateRange';
import FilterReasonSelect from './FilterReasonSelect';
import FilterTopicSelect from './FilterTopicSelect';
import FilterStatus from './FilterStatus';
import FilterSelect from './FilterSelect';
import FilterGoalType from './FilterGoalType';

const LAST_THIRTY_DAYS = formatDateRange({ lastThirtyDays: true, forDateTime: true });

const EMPTY_MULTI_SELECT = {
  is: [],
  'is not': [],
};

const handleArrayQuery = (q) => {
  if (q.length) {
    return [q].flat().join(', ');
  }
  return '';
};

export const createDateFilter = {
  id: 'createDate',
  display: 'Created on',
  conditions: DATE_CONDITIONS,
  defaultValues: {
    'is within': '',
    'is on or after': '',
    'is on or before': '',
    is: LAST_THIRTY_DAYS,
  },
  displayQuery: (query) => {
    if (query.includes('-')) {
      return formatDateRange({
        string: query,
        withSpaces: false,
      });
    }
    return moment(query, 'YYYY/MM/DD').format('MM/DD/YYYY');
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

export const reasonsFilter = {
  id: 'reason',
  display: 'Reasons',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterReasonSelect
      inputId={`reason-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const statusFilter = {
  id: 'status',
  display: 'Goal status',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterStatus
      inputId={`state-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const topicsFilter = {
  id: 'topic',
  display: 'Goal topics',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterTopicSelect
      inputId={`topic-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const grantNumberFilter = (possibleGrants) => ({
  id: 'grantNumber',
  display: 'Grant number',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query) => {
    const toDisplay = query.map(
      (q) => possibleGrants.find((g) => g.number === q).numberWithProgramTypes,
    );
    return handleArrayQuery(toDisplay);
  },
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterSelect
      onApply={onApplyQuery}
      inputId={`grant-number-${condition}-${id}`}
      labelText="Select grant numbers to filter by"
      options={possibleGrants.map((g) => ({
        value: g.number,
        label: g.numberWithProgramTypes,
      }))}
      selectedValues={query}
      mapByValue
    />
  ),
});

export const goalTypeFilter = {
  id: 'goalType',
  display: 'Goal type',
  conditions: FILTER_CONDITIONS,
  defaultValues: {
    is: 'RTTAPA',
    'is not': 'RTTAPA',
  },
  displayQuery: handleArrayQuery,
  renderInput: (_id, _condition, query, onApplyQuery) => (
    <FilterGoalType
      onApply={onApplyQuery}
      goalType={query}
    />
  ),
};
