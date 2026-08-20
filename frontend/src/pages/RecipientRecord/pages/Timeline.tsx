import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Checkbox, Dropdown } from '@trussworks/react-uswds';
import React, { useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { DATE_CONDITIONS, EMPTY_MULTI_SELECT, FILTER_CONDITIONS } from '../../../Constants';
import Container from '../../../components/Container';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import { purposeFilter } from '../../../components/filter/communicationLogFilters';
import FilterDateRange from '../../../components/filter/FilterDateRange';
import FilterPanel from '../../../components/filter/FilterPanel';
import FilterSelect from '../../../components/filter/FilterSelect';
import { goalCategoryFilter } from '../../../components/filter/goalFilters';
import NoResultsFound from '../../../components/NoResultsFound';
import { getRecipientTimeline } from '../../../fetchers/recipient';
import useFetch from '../../../hooks/useFetch';
import { formatDateRange } from '../../../utils';
import './Timeline.css';

interface TimelineProps {
  recipientId: string;
  regionId: string;
}

interface TimelineFilter {
  id: string;
  topic: string;
  condition: string;
  query: string | string[];
}

interface TimelineResponse {
  count: number;
  events: unknown[];
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

const TIMELINE_FILTER_CONFIG = [
  dateFilter,
  { ...purposeFilter, display: 'Communication purpose' },
  goalCategoryFilter,
  eventTypeFilter,
].sort((a, b) => a.display.localeCompare(b.display));

const INITIAL_FILTERS: TimelineFilter[] = [
  {
    id: uuidv4(),
    topic: 'date',
    condition: 'is within',
    query: LAST_TWELVE_MONTHS,
  },
];

const serializeFilter = ({ topic, condition, query }: TimelineFilter) =>
  JSON.stringify({ topic, condition, query });

export default function Timeline({ recipientId, regionId }: TimelineProps): React.ReactElement {
  const aboutDrawerRef = useRef<HTMLButtonElement>(null);
  const [filters, setFilters] = useState<TimelineFilter[]>(INITIAL_FILTERS);
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [hideMultiRecipientCommunications, setHideMultiRecipientCommunications] = useState(false);

  const serializedFilters = useMemo(() => filters.map(serializeFilter), [filters]);

  const { data, error, loading } = useFetch(
    { count: 0, events: [] } as TimelineResponse,
    () =>
      getRecipientTimeline(recipientId, regionId, {
        direction,
        filters: serializedFilters,
        excludeMultiRecipientCommunications: hideMultiRecipientCommunications,
      }),
    [recipientId, regionId, direction, serializedFilters, hideMultiRecipientCommunications],
    'Unable to load the TTA timeline.'
  );

  const events = Array.isArray(data?.events) ? data.events : [];
  const count =
    Number.isInteger(data?.count) && data.count >= 0
      ? Math.max(data.count, events.length)
      : events.length;

  const onRemoveFilter = (id: string) => {
    setFilters((currentFilters) => currentFilters.filter((filter) => filter.id !== id));
  };

  return (
    <>
      <Helmet>
        <title>TTA Timeline</title>
      </Helmet>
      <div className="maxw-widescreen">
        <div
          className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2"
          data-testid="timeline-filter-panel"
        >
          <FilterPanel
            filters={filters}
            onApplyFilters={setFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={TIMELINE_FILTER_CONFIG}
            applyButtonAria="Apply filters to the TTA timeline"
            allUserRegions={[]}
            manageRegions={false}
          />
        </div>
        <div className="margin-bottom-3">
          <DrawerTriggerButton drawerTriggerRef={aboutDrawerRef} customClass="">
            About this data
          </DrawerTriggerButton>
          <Drawer title="About the TTA timeline" triggerRef={aboutDrawerRef}>
            <p className="usa-prose">
              The TTA timeline brings together TTA activity, communications, goals, requests,
              training sessions, and monitoring events for this recipient.
            </p>
          </Drawer>
        </div>

        <Container
          className="width-full position-relative"
          paddingX={0}
          paddingY={0}
          loading={loading}
          loadingLabel="Loading TTA timeline"
        >
          <div className="padding-3">
            <h2 className="font-sans-lg margin-top-0 margin-bottom-2">TTA timeline</h2>
            <div className="display-flex flex-align-center flex-wrap flex-gap-3">
              <div className="display-flex flex-align-center">
                <label className="margin-right-1 text-no-wrap" htmlFor="timeline-sort">
                  View
                </label>
                <Dropdown
                  className="margin-top-0 width-mobile"
                  id="timeline-sort"
                  name="timeline-sort"
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">All TTA activity by date (most recent first)</option>
                  <option value="asc">All TTA activity by date (oldest first)</option>
                </Dropdown>
              </div>
              <div className="display-flex flex-align-center">
                <Checkbox
                  className="ttahub-timeline-checkbox"
                  id="hide-multi-recipient-communications"
                  name="hide-multi-recipient-communications"
                  label={
                    <span className="display-flex flex-align-center">
                      Hide multi-recipient communications
                      <FontAwesomeIcon
                        aria-hidden="true"
                        className="height-2 margin-left-1 width-2"
                        focusable="false"
                        icon={faUsers}
                      />
                    </span>
                  }
                  checked={hideMultiRecipientCommunications}
                  onChange={(event) => setHideMultiRecipientCommunications(event.target.checked)}
                />
              </div>
            </div>
          </div>

          <div className="border-top smart-hub-border-base-lighter padding-3 minh-card">
            {error && (
              <Alert type="error" role="alert" headingLevel="h3" slim>
                {error}
              </Alert>
            )}
            {!loading && !error && events.length === 0 && <NoResultsFound hideFilterHelp />}
            {!loading && !error && events.length > 0 && (
              <p className="margin-0" data-testid="timeline-results">
                {count} timeline {count === 1 ? 'event' : 'events'}
              </p>
            )}
          </div>
        </Container>
      </div>
    </>
  );
}
