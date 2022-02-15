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

const YEAR_TO_DATE = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

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
  display: 'Create date',
  conditions: DATE_CONDITIONS,
  defaultValues: {
    'is within': YEAR_TO_DATE,
    'is on or after': '',
    'is on or before': '',
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
  display: 'Status',
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
  display: 'Topics',
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
