import React from 'react';
import moment from 'moment';
import { formatDateRange } from '../DateRangeSelect';
import {
  DATE_CONDITIONS,
  SELECT_CONDITIONS,
} from '../constants';
import SpecialistSelect from '../SpecialistSelect';
import FilterDateRange from './FilterDateRange';
import FilterInput from './FilterInput';
import FilterReasonSelect from './FilterReasonSelect';
import FilterRegionalSelect from './FilterRegionSelect';
import FilterTopicSelect from './FilterTopicSelect';
import FilterPopulationSelect from './FilterPopulationSelect';
import FilterProgramType from './FilterProgramType';

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
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterDateRange
        condition={condition}
        query={query}
        updateSingleDate={onUpdate}
        onApplyDateRange={onApplyQuery}
      />
    ),
  },
  {
    id: 'grantNumber',
    display: 'Grant Number',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterInput
        query={query}
        id={id}
        condition={condition}
        onApply={onApplyQuery}
        type="grantNumber"
        label="Grant number"
      />
    ),
  },
  {
    id: 'programSpecialist',
    display: 'Program Specialist',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterInput
        query={query}
        id={id}
        condition={condition}
        onApply={onApplyQuery}
        type="programSpecialist"
        label="Program specialist name"
      />
    ),
  },
  {
    id: 'programType',
    display: 'Program Types',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterProgramType
        labelId={`reason-${condition}-${id}`}
        onApply={onApplyQuery}
      />
    ),
  },
  {
    id: 'reason',
    display: 'Reason',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterReasonSelect
        labelId={`reason-${condition}-${id}`}
        onApply={onApplyQuery}
      />
    ),
  },
  {
    id: 'grantee',
    display: 'Recipient name',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_TEXT_INPUT,
    displayQuery: handleStringQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterInput
        query={query}
        id={id}
        condition={condition}
        onApply={onApplyQuery}
        type="grantee"
        label="recipientName"
      />
    ),
  },
  {
    id: 'region',
    display: 'Region',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterRegionalSelect
        appliedRegion={query}
        onApply={onApplyQuery}
      />
    ),
  },
  {
    id: 'role',
    display: 'Role',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <SpecialistSelect
        labelId={`role-${condition}-${id}`}
        onApplyRoles={onApplyQuery}
        toggleAllInitial={false}
        hideToggleAll
      />
    ),
  },
  {
    id: 'targetPopulation',
    display: 'Target Population',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterPopulationSelect
        labelId={`population-${condition}-${id}`}
        onApply={onApplyQuery}
      />
    ),
  },
  {
    id: 'topic',
    display: 'Topics',
    conditions: SELECT_CONDITIONS,
    defaultValues: EMPTY_CHECKBOX_SELECT,
    displayQuery: handleArrayQuery,
    renderInput: (id, condition, query, onUpdate, onApplyQuery) => (
      <FilterTopicSelect
        labelId={`topic-${condition}-${id}`}
        onApply={onApplyQuery}
      />
    ),
  },
];
