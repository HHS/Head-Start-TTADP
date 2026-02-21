/* eslint-disable import/prefer-default-export */
import React from 'react';
import { FILTER_CONDITIONS, EMPTY_MULTI_SELECT, WITHOUT_ACTIVITY_DATE_CONDITIONS } from '../../Constants';
import FilterGroups from './FilterGroups';
import { useDisplayGroups, fixQueryWhetherStringOrArray } from './utils';
import { formatDateRange } from '../../utils';
import { formatDateValueFromFormat } from '../../lib/dates';
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

const withoutActivityDateValues = {
  is: LAST_THIRTY_DAYS,
  'is within': '',
};

const RECIPIENT_WITHOUT_TTA_DATE_OPTIONS = [
  {
    label: 'Last thirty days',
    value: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
  },
  {
    label: 'Last three months',
    value: formatDateRange({ lastThreeMonths: true, forDateTime: true }),
  },
  {
    label: 'Last six months',
    value: formatDateRange({ lastSixMonths: true, forDateTime: true }),
  },
  {
    label: 'Year to date',
    value: formatDateRange({ yearToDate: true, forDateTime: true }),
  },
];

export const recipientsWithoutTTA = {
  id: 'recipientsWithoutTTA',
  display: 'Recipients without TTA',
  conditions: WITHOUT_ACTIVITY_DATE_CONDITIONS,
  defaultValues: withoutActivityDateValues,
  displayQuery: (query) => {
    // we need to handle array vs string case here
    const smushed = fixQueryWhetherStringOrArray(query);
    if (smushed.includes('-')) {
      return formatDateRange({
        string: smushed,
        withSpaces: false,
      });
    }
    return formatDateValueFromFormat(smushed, 'YYYY/MM/DD', 'MM/DD/YYYY');
  },
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterDateRange
      condition={condition}
      query={query}
      updateSingleDate={onApplyQuery}
      onApplyDateRange={onApplyQuery}
      customDateOptions={RECIPIENT_WITHOUT_TTA_DATE_OPTIONS}
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
