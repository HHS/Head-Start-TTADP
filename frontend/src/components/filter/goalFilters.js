/* eslint-disable import/prefer-default-export */
import React from 'react';
import { format, parse } from 'date-fns';
import { formatDateRange } from '../../utils';
import {
  DATE_CONDITIONS,
  FILTER_CONDITIONS,
  EMPTY_MULTI_SELECT,
  EMPTY_TEXT_INPUT,
  SELECT_CONDITIONS,
} from '../../Constants';
import FilterDateRange from './FilterDateRange';
import FilterReasonSelect from './FilterReasonSelect';
import FilterTopicSelect from './FilterTopicSelect';
import FilterStatus from './FilterStatus';
import FilterSelect from './FilterSelect';
import FilterInput from './FilterInput';
import { handleArrayQuery } from './helpers';
import FilterRoles from './FilterRoles';
import FilterFEIRootCause from './FilterFEIRootCause';

const LAST_THIRTY_DAYS = formatDateRange({ lastThirtyDays: true, forDateTime: true });

export const createDateFilter = {
  id: 'createDate',
  display: 'Created on (goal)',
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
    return format(parse(query, 'yyyy/MM/dd', new Date()), 'MM/dd/yyyy');
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

export const userRolesFilter = {
  id: 'enteredByRole',
  display: 'Entered by role',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterRoles
      inputId={`user-role-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const feiRootCauseFilter = {
  id: 'goalResponse',
  display: 'FEI root cause',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterFEIRootCause
      inputId={`fei-root-cause-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const goalNameFilter = {
  id: 'goalName',
  display: 'Goal text',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: (q) => q,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`reportText-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Goal text"
    />
  ),
};

export const grantNumberFilter = (possibleGrants) => ({
  id: 'grantNumber',
  display: 'Grant number',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query) => {
    const toDisplay = query.map((q) => {
      const grant = (possibleGrants || []).find((g) => g.number === q);
      if (grant) {
        return grant.numberWithProgramTypes;
      }

      return q;
    });

    return handleArrayQuery(toDisplay);
  },
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterSelect
      onApply={onApplyQuery}
      inputId={`grant-number-${condition}-${id}`}
      labelText="Select grant numbers to filter by"
      options={(possibleGrants || []).map((g) => ({
        value: g.number,
        label: `${g.numberWithProgramTypes} - ${g.status}`,
      }))}
      selectedValues={query}
      mapByValue
    />
  ),
});
