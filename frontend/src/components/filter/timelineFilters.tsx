import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DATE_CONDITIONS, EMPTY_MULTI_SELECT, FILTER_CONDITIONS } from '../../Constants';
import { formatDateRange } from '../../utils';
import { purposeFilter } from './communicationLogFilters';
import FilterDateRange from './FilterDateRange';
import FilterSelect from './FilterSelect';
import { goalCategoryFilter } from './goalFilters';

export interface TimelineFilter {
  id: string;
  topic: string;
  condition: string;
  query: string | string[];
}

const LAST_TWELVE_MONTHS = formatDateRange({
  lastTwelveMonths: true,
  forDateTime: true,
});

const TIMELINE_DATE_OPTIONS = [
  {
    label: 'Last three months',
    value: formatDateRange({ lastThreeMonths: true, forDateTime: true }),
  },
  {
    label: 'Last six months',
    value: formatDateRange({ lastSixMonths: true, forDateTime: true }),
  },
  {
    label: 'Last twelve months',
    value: LAST_TWELVE_MONTHS,
  },
];

const EVENT_TYPES = [
  'Email communication',
  'Phone communication',
  'In person communication',
  'Virtual communication',
  'TTA activity',
  'Training session',
  'Goal added',
  'Goal suspended',
  'Goal closed',
  'Goal reopened',
  'TTA request',
  'Monitoring report received',
].map((label) => ({ label, value: label }));

const dateFilter = {
  id: 'date',
  display: 'Date',
  conditions: DATE_CONDITIONS,
  defaultValues: {
    is: LAST_TWELVE_MONTHS,
    'is within': '',
    'is on or after': '',
    'is on or before': '',
  },
  displayQuery: (query: string | string[]) => {
    const value = Array.isArray(query) ? query.join(', ') : query;
    if (value.includes('-')) {
      return formatDateRange({ string: value, withSpaces: true });
    }
    return value;
  },
  renderInput: (
    _id: string,
    condition: string,
    query: string | string[],
    onApplyQuery: (value: string) => void
  ) => (
    <FilterDateRange
      condition={condition}
      query={query}
      onApplyDateRange={onApplyQuery}
      customDateOptions={TIMELINE_DATE_OPTIONS}
    />
  ),
};

const eventTypeFilter = {
  id: 'eventType',
  display: 'TTA event type',
  conditions: FILTER_CONDITIONS,
  defaultValues: EMPTY_MULTI_SELECT,
  displayQuery: (query: string | string[]) => [query].flat().join(', '),
  renderInput: (
    id: string,
    condition: string,
    query: string[],
    onApplyQuery: (value: string[]) => void
  ) => (
    <FilterSelect
      onApply={onApplyQuery}
      inputId={`event-type-${condition}-${id}`}
      labelText="Select TTA event types to filter by"
      options={EVENT_TYPES}
      selectedValues={query}
    />
  ),
};

export const TIMELINE_FILTER_CONFIG = [
  dateFilter,
  { ...purposeFilter, display: 'Communication purpose' },
  goalCategoryFilter,
  eventTypeFilter,
].sort((a, b) => a.display.localeCompare(b.display));

export const createInitialTimelineFilters = (): TimelineFilter[] => [
  {
    id: uuidv4(),
    topic: 'date',
    condition: 'is within',
    query: LAST_TWELVE_MONTHS,
  },
];

export const serializeTimelineFilter = ({ topic, condition, query }: TimelineFilter) =>
  JSON.stringify({ topic, condition, query });
