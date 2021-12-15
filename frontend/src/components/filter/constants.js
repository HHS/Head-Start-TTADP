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

const EMPTY_CHECKBOX_SELECT = {
  Contains: [],
  'Does not contain': [],
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

// eslint-disable-next-line import/prefer-default-export
export const FILTER_CONFIG = [
  {
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
    renderInput: (id, condition, query, onApplyQuery, onKeyDown, dateRangeOptions) => (
      <FilterDateRange
        condition={condition}
        query={query}
        updateSingleDate={onApplyQuery}
        onApplyDateRange={onApplyQuery}
        options={dateRangeOptions}
        id={id}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'grantNumber',
    display: 'Grant number',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery, onKeyDown) => (
      <FilterInput
        query={query}
        id={id}
        condition={condition}
        onApply={onApplyQuery}
        type="grantNumber"
        label="Enter a grant number"
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'programSpecialist',
    display: 'Program specialist',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery, onKeyDown) => (
      <FilterInput
        query={query}
        inputId={`reason-${condition}-${id}`}
        onApply={onApplyQuery}
        label="Enter a program specialist name"
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'programType',
    display: 'Program types',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterProgramType
        inputId={`reason-${condition}-${id}`}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'reason',
    display: 'Reason',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterReasonSelect
        inputId={`reason-${condition}-${id}`}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'grantee',
    display: 'Recipient name',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterInput
        query={query}
        inputId={`recipient-${condition}-${id}`}
        onApply={onApplyQuery}
        label="Enter a recipient name"
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'region',
    display: 'Region',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery, onKeyDown) => (
      <FilterRegionalSelect
        appliedRegion={query}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'role',
    display: 'Specialist role',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterSpecialistSelect
        inputId={`role-${condition}-${id}`}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'targetPopulation',
    display: 'Target population',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterPopulationSelect
        inputId={`population-${condition}-${id}`}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
  {
    id: 'topic',
    display: 'Topics',
    conditions: FILTER_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onApplyQuery, onKeyDown) => (
      <FilterTopicSelect
        inputId={`topic-${condition}-${id}`}
        onApply={onApplyQuery}
        onKeyDown={onKeyDown}
      />
    ),
  },
];
