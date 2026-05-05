import moment from 'moment';
import React from 'react';
import {
  DATE_CONDITIONS,
  EMPTY_MULTI_SELECT,
  FILTER_CONDITIONS,
  REGION_CONDITIONS,
} from '../../Constants';
import { formatDateRange } from '../../utils';
import FilterCollabGoal from './FilterCollabGoal';
import FilterDateRange from './FilterDateRange';
import FilterRegionalSelect from './FilterRegionSelect';

const EMPTY_SINGLE_SELECT = {
  is: '',
  'is not': '',
};

const handleStringQuery = (q) => q;

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
  display: 'Date started',
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
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCollabGoal inputId={`goal-${condition}-${id}`} onApply={onApplyQuery} query={query} />
  ),
};
