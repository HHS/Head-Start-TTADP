import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Button, Checkbox, Dropdown } from '@trussworks/react-uswds';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import Container from '../../../components/Container';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPanel from '../../../components/filter/FilterPanel';
import {
  createInitialTimelineFilters,
  serializeTimelineFilter,
  TIMELINE_FILTER_CONFIG,
} from '../../../components/filter/timelineFilters';
import NoResultsFound from '../../../components/NoResultsFound';
import TimelineEvent from '../../../components/TimelineEvent';
import useFilters from '../../../hooks/useFilters';
import useRecipientTimeline from '../../../hooks/useRecipientTimeline';
import UserContext from '../../../UserContext';
import './Timeline.css';

const FILTER_KEY = 'timeline-filters';

interface TimelineProps {
  recipientId: string;
  regionId: string;
}

export default function Timeline({ recipientId, regionId }: TimelineProps): React.ReactElement {
  const aboutDrawerRef = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [hideMultiRecipientCommunications, setHideMultiRecipientCommunications] = useState(false);
  const { user } = useContext(UserContext);
  const initialFilters = useMemo(() => createInitialTimelineFilters(), []);
  const { filters, onApplyFilters, onRemoveFilter, filterConfig } = useFilters(
    user,
    FILTER_KEY,
    false,
    initialFilters,
    TIMELINE_FILTER_CONFIG
  );

  const supportedFilterTopics = useMemo(
    () => new Set(filterConfig.map(({ id }) => id)),
    [filterConfig]
  );
  const supportedFilters = useMemo(
    () => filters.filter(({ topic }) => supportedFilterTopics.has(topic)),
    [filters, supportedFilterTopics]
  );
  const serializedFilters = useMemo(
    () => supportedFilters.map(serializeTimelineFilter),
    [supportedFilters]
  );

  const { events, count, error, loading, hasMore, loadMore } = useRecipientTimeline(
    recipientId,
    regionId,
    {
      direction,
      filters: serializedFilters,
      excludeMultiRecipientCommunications: hideMultiRecipientCommunications,
    }
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const supportsIntersectionObserver = typeof window.IntersectionObserver === 'function';

  // Rebuilding the observer on every loading flip is intentional. A fresh observe() fires an
  // initial callback, which chains the next load when a short slice leaves the sentinel in view.
  // Keeping one long lived observer would stall the timeline until the user scrolls.
  useEffect(() => {
    if (loading || error || !hasMore || !sentinelRef.current || !supportsIntersectionObserver) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, error, hasMore, loadMore, supportsIntersectionObserver]);

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
            filters={supportedFilters}
            onApplyFilters={onApplyFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={filterConfig}
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
          loading={loading && events.length === 0}
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
            {events.length > 0 && (
              <p className="usa-sr-only" data-testid="timeline-results">
                {count} timeline {count === 1 ? 'event' : 'events'}
              </p>
            )}
            {events.length > 0 && (
              <ol className="usa-list--unstyled" aria-label="Timeline events">
                {events.map((event, index) => (
                  <li key={JSON.stringify([event.source, event.sourceId, event.eventType])}>
                    <TimelineEvent event={event} isLast={index === events.length - 1} />
                  </li>
                ))}
              </ol>
            )}
            <div ref={sentinelRef}>
              <p role="status" className="margin-bottom-0">
                {loading && events.length > 0 && 'Loading more events…'}
                {!loading && !error && !hasMore && events.length > 0 && 'End of timeline.'}
              </p>
              {/* Infinite scroll replaces "Load more" where supported; retry is always offered. */}
              {!loading && (error || (hasMore && !supportsIntersectionObserver)) && (
                <Button type="button" onClick={loadMore} className="margin-top-2">
                  {error ? 'Retry loading events' : 'Load more events'}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
