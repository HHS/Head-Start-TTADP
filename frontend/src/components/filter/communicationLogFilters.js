import React from 'react';
import moment from 'moment';
import {
  DATE_CONDITIONS,
  FILTER_CONDITIONS,
  SELECT_CONDITIONS,
} from '../../Constants';
import { formatDateRange } from '../../utils';
import { fixQueryWhetherStringOrArray } from './utils';
import FilterDateRange from './FilterDateRange';
import FilterCommunicationMethod from './FilterCommunicationMethod';
import FilterCommunicationResult from './FilterCommunicationResult';
import FilterInput from './FilterInput';

const EMPTY_MULTI_SELECT = {
  is: [],
  'is not': [],
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

const LAST_THIRTY_DAYS = formatDateRange({ lastThirtyDays: true, forDateTime: true });

const defaultDateValues = {
  is: LAST_THIRTY_DAYS,
  'is within': '',
  'is on or after': '',
  'is on or before': '',
};

export const methodFilter = {
  id: 'method',
  display: 'Method',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCommunicationMethod
      inputId={`method-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const resultFilter = {
  id: 'result',
  display: 'Result',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: handleArrayQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterCommunicationResult
      inputId={`result-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const creatorFilter = {
  id: 'creator',
  display: 'Creator',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`creator-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a creator name"
    />
  ),
};

export const communicationDateFilter = {
  id: 'communicationDate',
  display: 'Communication date',
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
  renderInput: (_id, condition, query, onApplyQuery) => (
    <FilterDateRange
      condition={condition}
      query={query}
      updateSingleDate={onApplyQuery}
      onApplyDateRange={onApplyQuery}
    />
  ),
};
