/* eslint-disable import/prefer-default-export */
import React from 'react';
import moment from 'moment';
import { FILTER_CONDITIONS, EMPTY_MULTI_SELECT, DATE_CONDITIONS } from '../../Constants';
import FilterGroups from './FilterGroups';
import { useDisplayGroups, fixQueryWhetherStringOrArray } from './utils';
import { formatDateRange } from '../../utils';
import FilterDateRange from './FilterDateRange';
import GrantStatus, { displayGrantsStatus } from './GrantStatus';

export const groupsFilter = {
  id: 'group',
  display: 'Group',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: useDisplayGroups,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterGroups
      inputId={`group-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

const LAST_THIRTY_DAYS = formatDateRange({ lastThirtyDays: true, forDateTime: true });

const defaultDateValues = {
  is: LAST_THIRTY_DAYS,
  'is within': '',
  'is on or after': '',
  'is on or before': '',
};

export const lastTTA = {
  id: 'lastTTA',
  display: 'Last TTA',
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

export const grantStatusFilter = {
  id: 'grantStatus',
  display: 'Grant status',
  conditions: FILTER_CONDITIONS,
  defaultValues: {
    is: 'active',
    'is not': 'active',
  },
  displayQuery: displayGrantsStatus,
  renderInput: (id, condition, query, onApplyQuery) => (
    <GrantStatus
      inputId={`grantStatus-${condition.replace(/ /g, '-')}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
