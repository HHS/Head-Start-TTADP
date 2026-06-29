/* eslint-disable import/prefer-default-export */

import { GOAL_CLOSE_REASONS } from '@ttahub/common';
import moment from 'moment';
import React from 'react';
import {
  DATE_CONDITIONS,
  EMPTY_MULTI_SELECT,
  EMPTY_TEXT_INPUT,
  FILTER_CONDITIONS,
  REGION_CONDITIONS,
  SELECT_CONDITIONS,
} from '../../Constants';
import { formatDateRange } from '../../utils';
import FilterDateRange from './FilterDateRange';
import FilterFEIRootCause from './FilterFEIRootCause';
import FilterGoalStandard from './FilterGoalStandard';
import FilterInput from './FilterInput';
import FilterReasonSelect from './FilterReasonSelect';
import FilterRegionSelect from './FilterRegionSelect';
import FilterRoles from './FilterRoles';
import FilterSelect from './FilterSelect';
import FilterStateSelect from './FilterStateSelect';
import FilterStatus from './FilterStatus';
import FilterTopicSelect from './FilterTopicSelect';
import { handleArrayQuery } from './helpers';
import { fixQueryWhetherStringOrArray } from './utils';

const EMPTY_SINGLE_SELECT = { is: '' };
const handleStringQuery = (q) => q;

export const regionFilter = {
  id: 'region',
  display: 'Region',
  conditions: REGION_CONDITIONS,
  defaultValues: EMPTY_SINGLE_SELECT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterRegionSelect appliedRegion={query} onApply={onApplyQuery} />
  ),
};

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
    <FilterStatus inputId={`state-${condition}-${id}`} onApply={onApplyQuery} query={query} />
  ),
};

const GOAL_DASHBOARD_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Closed', 'Suspended'].map(
  (status) => ({ label: status, value: status })
);

export const goalDashboardStatusFilter = {
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
      options={GOAL_DASHBOARD_STATUS_OPTIONS}
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
    <FilterTopicSelect inputId={`topic-${condition}-${id}`} onApply={onApplyQuery} query={query} />
  ),
};

export const userRolesFilter = {
  id: 'enteredByRole',
  display: 'Entered by role',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterRoles inputId={`user-role-${condition}-${id}`} onApply={onApplyQuery} query={query} />
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

export const goalCreatorFilter = {
  id: 'goalCreator',
  display: 'Goal creator',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: (q) => q,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`goalCreator-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a creator name"
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

export const goalCategoryFilter = {
  id: 'standard',
  display: 'Goal category',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterGoalStandard
      query={query}
      inputId={`goalCategory-${condition}-${id}`}
      onApply={onApplyQuery}
    />
  ),
};

const GOAL_CLOSED_REASON_OPTIONS = GOAL_CLOSE_REASONS.map((reason) => ({
  label: reason,
  value: reason,
}));

export const goalClosedReasonFilter = {
  id: 'closedReason',
  display: 'Goal closure reason',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterSelect
      onApply={onApplyQuery}
      inputId={`closed-reason-${condition}-${id}`}
      labelText="Select goal closure reasons to filter by"
      options={GOAL_CLOSED_REASON_OPTIONS}
      selectedValues={query}
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

export const stateCodeFilter = {
  id: 'stateCode',
  display: 'State or territory',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterStateSelect
      inputId={`state-${condition.replace(/\s+/g, '-')}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};
