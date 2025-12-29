/* eslint-disable import/prefer-default-export */
import React from 'react';
import moment from 'moment';
import { formatDateRange } from '../../utils';
import {
  DATE_CONDITIONS,
  REGION_CONDITIONS,
  SINGLE_CREATOR_OR_COLLABORATOR_CONDITIONS,
  EMPTY_MULTI_SELECT,
  SELECT_CONDITIONS,
} from '../../Constants';
import FilterInput from './FilterInput';
import FilterDateRange from './FilterDateRange';
import FilterRegionalSelect from './FilterRegionSelect';
import { useDisplayStaff } from './utils';
import FilterTrainingReportStaff from './FilterTrainingReportStaff';

const EMPTY_SINGLE_SELECT = {
  is: '',
  'is not': '',
};

const EMPTY_TEXT_INPUT = {
  contains: '',
  'does not contain': '',
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
    <FilterRegionalSelect
      appliedRegion={query}
      onApply={onApplyQuery}
    />
  ),
};

export const collaboratorsFilter = {
  id: 'collaborators',
  display: 'Collaborators',
  conditions: SINGLE_CREATOR_OR_COLLABORATOR_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: useDisplayStaff,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterTrainingReportStaff
      inputId={`collaborators-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const creatorFilter = {
  id: 'creator',
  display: 'Creator',
  conditions: SINGLE_CREATOR_OR_COLLABORATOR_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: useDisplayStaff,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterTrainingReportStaff
      inputId={`creator-${condition}-${id}`}
      onApply={onApplyQuery}
      query={query}
    />
  ),
};

export const eventIdFilter = {
  id: 'eventId',
  display: 'Event ID',
  conditions: SELECT_CONDITIONS,
  defaultValues: EMPTY_TEXT_INPUT,
  displayQuery: handleStringQuery,
  renderInput: (id, condition, query, onApplyQuery) => (
    <FilterInput
      query={query}
      inputId={`eventId-${condition}-${id}`}
      onApply={onApplyQuery}
      label="Enter a event id"
    />
  ),
};
