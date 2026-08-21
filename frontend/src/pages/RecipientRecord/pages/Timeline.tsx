import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Checkbox, Dropdown } from '@trussworks/react-uswds';
import React, { useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import Container from '../../../components/Container';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import {
  createInitialTimelineFilters,
  serializeTimelineFilter,
  TIMELINE_FILTER_CONFIG,
  type TimelineFilter,
} from '../../../components/filter/timelineFilters';
import NoResultsFound from '../../../components/NoResultsFound';
import { getRecipientTimeline } from '../../../fetchers/recipient';
import useFetch from '../../../hooks/useFetch';
import './Timeline.css';

interface TimelineProps {
  recipientId: string;
  regionId: string;
}

interface TimelineResponse {
  count: number;
  events: unknown[];
}

export default function Timeline({ recipientId, regionId }: TimelineProps): React.ReactElement {
  const aboutDrawerRef = useRef<HTMLButtonElement>(null);
  const [filters, setFilters] = useState<TimelineFilter[]>(createInitialTimelineFilters);
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [hideMultiRecipientCommunications, setHideMultiRecipientCommunications] = useState(false);

  const serializedFilters = useMemo(() => filters.map(serializeTimelineFilter), [filters]);

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
