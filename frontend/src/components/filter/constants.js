import React from 'react';
import moment from 'moment';
import { formatDateRange } from '../DateRangeSelect';
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

const YEAR_TO_DATE = formatDateRange({
  yearToDate: true,
  forDateTime: true,
});

const EMPTY_MULTI_SELECT = {
  Is: [],
  'Is not': [],
};

const EMPTY_SINGLE_SELECT = {
  Is: '',
  'Is not': '',
};

const EMPTY_TEXT_INPUT = {
  Contains: '',
  'Does not contain': '',
};

const handleArrayQuery = (q) => {
  if (q.length) {
    return q.join(', ');
  }
  return '';
};

const handleStringQuery = (q) => q;

export const START_DATE_FILTER = {
  id: 'startDate',
  display: 'Date range',
  conditions: DATE_CONDITIONS,
  defaultValues: {
    'Is within': YEAR_TO_DATE,
    'Is after': '',
    'Is before': '',
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
  renderInput: (id, condition, query, onApplyQuery, dateRangeOptions) => (
    <FilterDateRange
      condition={condition}
      query={query}
      updateSingleDate={onApplyQuery}
      onApplyDateRange={onApplyQuery}
      options={dateRangeOptions}
      id={id}
    />
  ),
};

export const GRANT_NUMBER_FILTER = {
  id: 'grantNumber',
  display: 'Grant number',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`reason-${condition}-${id}`}
      onApply={onApplyQuery}
      type="grantNumber"
      label="Enter a grant number"
    />
  ),
};

export const REPORT_ID_FILTER = {
  id: 'reportId',
  display: 'Report ID',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`report-id-${condition}-${id}`}
      onApply={onApplyQuery}
      type="reportId"
      label="Enter a report id"
    />
  ),
};

export const PROGRAM_SPECIALIST_FILTER = {
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

export const PROGRAM_TYPE_FILTER = {
  id: 'programType',
  display: 'Program types',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterProgramType
      inputId={`reason-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const REASON_FILTER = {
  id: 'reason',
  display: 'Reason',
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

export const RECIPIENT_NAME_FILTER = {
  id: 'recipient',
  display: 'Recipient name',
  conditions: FILTER_CONDITIONS,
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

export const REGION_FILTER = {
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

export const ROLE_FILTER = {
  id: 'role',
  display: 'Specialist role',
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

export const TARGET_POPULATION_FILTER = {
  id: 'targetPopulation',
  display: 'Target population',
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

export const TOPICS_FILTER = {
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

export const AVAILABLE_FILTERS = [
  'startDate',
  'grantNumber',
  'programSpecialist',
  'programType',
  'reason',
  'recipient',
  'region',
  'role',
  'targetPopulation',
  'topic',
];
