import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TRAINING_REPORT_STATUSES_URL_PARAMS } from '@ttahub/common';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useHistory } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import './index.scss';
import { Alert, Button, Grid } from '@trussworks/react-uswds';
import AppLoadingContext from '../../AppLoadingContext';
import colors from '../../colors';
import FilterPanel from '../../components/filter/FilterPanel';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import StaffProvider from '../../components/StaffProvider';
import Tabs from '../../components/Tabs';
import TrainingReportAlerts from '../../components/TrainingReportAlerts';
import WidgetContainer from '../../components/WidgetContainer';
import FilterContext from '../../FilterContext';
import { deleteEvent, getEventsByStatus } from '../../fetchers/event';
import { deleteSession } from '../../fetchers/session';
import useFilters from '../../hooks/useFilters';
import useSessionSort from '../../hooks/useSessionSort';
import UserContext from '../../UserContext';
import { expandFilters, filtersToQueryString } from '../../utils';
import { showFilterWithMyRegions } from '../regionHelpers';
import EventCards from './components/EventCards';
import { TRAINING_REPORT_FILTER_CONFIG } from './constants';

const FILTER_KEY = 'training-report-filters';
export const EVENTS_PER_PAGE = 10;

const tabValues = Object.keys(TRAINING_REPORT_STATUSES_URL_PARAMS).map((status) => ({
  key: TRAINING_REPORT_STATUSES_URL_PARAMS[status],
  value: status,
}));

const MESSAGE_TEMPLATES = {
  eventSubmitted: (_sessionName, eventId, dateStr) => (
    <>
      You submitted Training Event <Link to={`/training-report/view/${eventId}`}>{eventId}</Link> on{' '}
      {dateStr}
    </>
  ),
  sessionCreated: (_sessionName, eventId, dateStr) => (
    <>
      You created a session for Training Event{' '}
      <Link to={`/training-report/view/${eventId}`}>{eventId}</Link> on {dateStr}
    </>
  ),
  sessionSubmitted: (sessionName, eventId, dateStr) => (
    <>
      You submitted the session {sessionName} of Training Event{' '}
      <Link to={`/training-report/view/${eventId}`}>{eventId}</Link> on {dateStr}
    </>
  ),
  sessionReviewSubmitted: (sessionName, eventId, dateStr) => (
    <>
      Your review for session {sessionName} of Training Event{' '}
      <Link to={`/training-report/view/${eventId}`}>{eventId}</Link> was submitted on {dateStr}
    </>
  ),
};

export const evaluateMessageFromHistory = (history) => {
  const { state } = history.location;
  if (state?.message) {
    const { message } = state;

    if (!message.eventId) {
      return null;
    }

    const { messageTemplate } = message;

    if (MESSAGE_TEMPLATES[messageTemplate]) {
      return MESSAGE_TEMPLATES[messageTemplate](
        message.sessionName,
        message.eventId,
        message.dateStr
      );
    }

    // default case
    return MESSAGE_TEMPLATES.eventSubmitted(message.sessionName, message.eventId, message.dateStr);
  }

  return null;
};

function TrainingReportsContent({ match }) {
  const {
    params: { status },
  } = match;
  const { user } = useContext(UserContext);
  const [error, updateError] = useState();
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [displayEvents, setDisplayEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  // bumped to refetch the current page after an event leaves it
  const [refetchKey, setRefetchKey] = useState(0);
  const [cardsInternalMessage, setCardsInternalMessage] = useState();
  const history = useHistory();
  // eslint-disable-next-line max-len
  const [msg, setMsg] = useState(evaluateMessageFromHistory(history));

  const {
    regions,
    defaultRegion,
    allRegionsFilters,
    hasMultipleRegions,
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(
    user,
    FILTER_KEY,
    true, // manage regions
    [],
    TRAINING_REPORT_FILTER_CONFIG
  );

  // kept in session storage so returning from an event (e.g. "Edit event") keeps the page
  const [sortConfig, setSortConfig] = useSessionSort(
    { sortBy: 'eventId', direction: 'asc', activePage: 1, perPage: EVENTS_PER_PAGE },
    'trainingReportsEvents'
  );
  const { activePage, perPage: pageSize } = sortConfig;
  const showAll = pageSize === 'all';
  // with "all" there's a single page as long as the whole list
  const perPage = showAll ? Math.max(totalCount, 1) : pageSize;
  const offset = showAll ? 0 : (activePage - 1) * pageSize;

  const handlePageChange = (pageNumber) => {
    setSortConfig((prev) => ({ ...prev, activePage: pageNumber }));
  };

  const perPageChange = (e) => {
    const { value } = e.target;
    const newPageSize = value === 'all' ? 'all' : Number(value);
    setSortConfig((prev) => ({ ...prev, perPage: newPageSize, activePage: 1 }));
  };

  // switching tabs or changing filters starts back on page 1. This adjusts state during
  // render (not in an effect) so the events fetch never runs with the previous page.
  const [pageScope, setPageScope] = useState({ status, filters });
  if (pageScope.status !== status || pageScope.filters !== filters) {
    setPageScope({ status, filters });
    if (activePage !== 1) {
      handlePageChange(1);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey isn't read here, bumping it refetches the current page after an event leaves it
  useEffect(() => {
    let ignore = false;
    async function fetchEvents() {
      setAppLoadingText('Fetching events...');
      setIsAppLoading(true);
      const filterQuery = filtersToQueryString(expandFilters(filters));
      // the API returns every event when there's no limit
      const pageQuery = showAll ? '' : `limit=${pageSize}&offset=${offset}`;
      const query = [filterQuery, pageQuery].filter(Boolean).join('&');
      try {
        const { count, rows } = await getEventsByStatus(status, query);
        if (ignore) {
          return;
        }
        // a remembered page can be past the end if events were removed since
        if (rows.length === 0 && offset > 0) {
          const lastPage = Math.max(1, Math.ceil(count / pageSize));
          setSortConfig((prev) => ({ ...prev, activePage: lastPage }));
          return;
        }
        setDisplayEvents(rows);
        setTotalCount(count);
        updateError('');
      } catch (e) {
        if (ignore) {
          return;
        }
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch events');
      } finally {
        setIsAppLoading(false);
      }
    }
    fetchEvents();
    return () => {
      ignore = true;
    };
  }, [
    status,
    setAppLoadingText,
    setIsAppLoading,
    filters,
    offset,
    pageSize,
    showAll,
    setSortConfig,
    refetchKey,
  ]);

  const regionLabel = () => {
    if (defaultRegion === 14 || hasMultipleRegions) {
      return 'your regions';
    }
    return 'your region';
  };

  const onRemoveSession = async (session) => {
    try {
      // delete the session
      await deleteSession(String(session.id));

      // update the UI
      // copy these events
      const events = displayEvents.map((event) => ({ ...event }));

      // find the event (we can modify it in place)
      const event = events.find((e) => e.id === session.eventId);

      // filter out the session
      event.sessionReports = event.sessionReports.filter((s) => s.id !== session.id);

      // update the state
      setDisplayEvents(events);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  const removeEventFromDisplay = (id) => {
    // hide the card right away, then refetch so the page backfills from the next one and
    // the count stays accurate (an emptied page falls back to the last page in the fetch)
    setDisplayEvents((events) => events.filter((e) => e.id !== id));
    setRefetchKey((key) => key + 1);
  };

  /**
   *
   * eventId is the number from smartsheet (used in queries)
   * id is the event id from the DB
   *
   * @param {number} eventId
   * @param {number} id
   */
  const onDeleteEvent = async (eventId, id) => {
    try {
      // delete the event
      await deleteEvent(String(eventId));
      removeEventFromDisplay(id);
    } catch (e) {
      updateError('Unable to delete event');
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };
  function convertToTitleCase(str) {
    if (!str) {
      return '';
    }
    return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
  }
  const statusForDisplay = tabValues.find((t) => t.value === status).key;
  const titleCaseStatus = convertToTitleCase(statusForDisplay);
  return (
    <StaffProvider>
      <div className="ttahub-training-reports">
        <Helmet>
          <title>{titleCaseStatus} - Training Reports</title>
        </Helmet>

        <RegionPermissionModal
          filters={filters}
          user={user}
          showFilterWithMyRegions={() =>
            showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
        />
        {msg && (
          <Alert
            type="success"
            role="alert"
            className="margin-bottom-2"
            cta={
              <Button
                role="button"
                unstyled
                aria-label="dismiss alert"
                onClick={() => setMsg(null)}
              >
                <span className="fa-sm margin-right-2">
                  <FontAwesomeIcon color={colors.textInk} icon={faTimesCircle} />
                </span>
              </Button>
            }
          >
            {msg}
          </Alert>
        )}
        <Grid>
          <Grid row gap>
            <Grid>
              <h1 className="landing margin-top-0 margin-bottom-3">{`Training reports - ${regionLabel()}`}</h1>
            </Grid>
          </Grid>
          <Grid row>
            {error && (
              <Alert className="margin-bottom-2" type="error" role="alert">
                {error}
              </Alert>
            )}
          </Grid>
          <Grid
            col={12}
            className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2"
          >
            <FilterPanel
              applyButtonAria="apply filters for training reports"
              filters={filters}
              onApplyFilters={onApplyFilters}
              onRemoveFilter={onRemoveFilter}
              filterConfig={filterConfig}
              allUserRegions={regions}
            />
          </Grid>

          <TrainingReportAlerts />

          <Grid row>
            <WidgetContainer
              title="Events"
              loading={false}
              loadingLabel="Training events loading"
              showHeaderBorder={false}
              showPagingTop={totalCount > 0}
              showPagingBottom={totalCount > 0}
              currentPage={activePage}
              totalCount={totalCount}
              offset={offset}
              perPage={perPage}
              handlePageChange={handlePageChange}
              paginationCardTopProps={{
                perPageChange,
                noXofX: true,
                perPageSelectValue: pageSize,
                allOptionValue: 'all',
                hidePagination: true,
              }}
            >
              <Tabs tabs={tabValues} ariaLabel="Training events" />
              <EventCards
                events={displayEvents}
                eventType={status}
                onRemoveSession={onRemoveSession}
                onDeleteEvent={onDeleteEvent}
                removeEventFromDisplay={removeEventFromDisplay}
                alerts={{
                  message: cardsInternalMessage,
                  setMessage: setCardsInternalMessage,
                  setParentMessage: (updatedMessage) => {
                    setCardsInternalMessage(null);
                    setMsg(updatedMessage);
                  },
                }}
              />
            </WidgetContainer>
          </Grid>
        </Grid>
      </div>
    </StaffProvider>
  );
}

const trainingReportsPropTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.number,
        scopeId: PropTypes.number,
        regionId: PropTypes.number,
      })
    ),
  }),
};

const trainingReportsDefaultProps = {
  user: null,
};

TrainingReportsContent.propTypes = trainingReportsPropTypes;
TrainingReportsContent.defaultProps = trainingReportsDefaultProps;

export default function TrainingReports(props) {
  return (
    <FilterContext.Provider value={{ filterKey: FILTER_KEY }}>
      <TrainingReportsContent {...props} />
    </FilterContext.Provider>
  );
}

TrainingReports.propTypes = trainingReportsPropTypes;
TrainingReports.defaultProps = trainingReportsDefaultProps;
