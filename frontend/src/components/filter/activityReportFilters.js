/* eslint-disable import/prefer-default-export */
import React from 'react';
import moment from 'moment';
import { formatDateRange } from '../../utils';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
  FILTER_CONDITIONS,
} from '../../Constants';
import FilterDateRange from './FilterDateRange';
import FilterInput from './FilterInput';
import FilterReasonSelect from './FilterReasonSelect';
import FilterRegionalSelect from './FilterRegionSelect';
import FilterTopicSelect from './FilterTopicSelect';
import FilterPopulationSelect from './FilterPopulationSelect';
import FilterProgramType from './FilterProgramType';
import FilterSpecialistSelect from './FilterSpecialistSelect';
import FilterStateSelect from './FilterStateSelect';
import FilterOtherEntitiesSelect from './FilterOtherEntitiesSelect';

const EMPTY_MULTI_SELECT = {
  is: [],
  'is not': [],
};

const EMPTY_SINGLE_SELECT = {
  is: '',
  'is not': '',
};

const EMPTY_TEXT_INPUT = {
  contains: '',
  'does not contain': '',
};

const handleArrayQuery = (q) => {
  if (q.length) {
    return [q].flat().join(', ');
  }
  return '';
};

const handleStringQuery = (q) => q;

const defaultDateValues = {
  is: '',
  'is within': '',
  'is on or after': '',
  'is on or before': '',
};

export const startDateFilter = {
  id: 'startDate',
  display: 'Start date',
  conditions: DATE_CONDITIONS,
  defaultValues: defaultDateValues,
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

export const endDateFilter = {
  id: 'endDate',
  display: 'End date',
  conditions: DATE_CONDITIONS,
  defaultValues: defaultDateValues,
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

export const grantNumberFilter = {
  id: 'grantNumber',
  display: 'Grant number',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`grantNumber-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a grant number"
    />
  ),
};

export const otherEntitiesFilter = {
  id: 'otherEntities',
  display: 'Other entities',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterOtherEntitiesSelect
      inputId={`role-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const programSpecialistFilter = {
  id: 'programSpecialist',
  display: 'Program specialist',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`reason-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a program specialist name"
    />
  ),
};
export const programTypeFilter = {
  id: 'programType',
  display: 'Program types',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterProgramType
      inputId={`programType-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
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

export const recipientFilter = {
  id: 'recipient',
  display: 'Recipient name',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`recipient-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a recipient name"
    />
  ),
};

export const reportIdFilter = {
  id: 'reportId',
  display: 'Report ID',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`reportId-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a report id"
    />
  ),
};

export const regionFilter = {
  id: 'region',
  display: 'Region',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_SINGLE_SELECT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterRegionalSelect
      appliedRegion={query}
      onApply={onApplyQuery}
    />
  ),
};

export const specialistRoleFilter = {
  id: 'role',
  display: 'Specialist roles',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterSpecialistSelect
      inputId={`role-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const stateCodeFilter = {
  id: 'stateCode',
  display: 'State',
  conditions: ['contains'],
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterStateSelect
      inputId={`state-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const targetPopulationsFilter = {
  id: 'targetPopulations',
  display: 'Target populations',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterPopulationSelect
      inputId={`population-${condition}-${id}`}
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
