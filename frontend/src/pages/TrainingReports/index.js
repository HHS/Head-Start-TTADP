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
import { deleteEvent, getEventsByStatus } from '../../fetchers/event';
import { deleteSession } from '../../fetchers/session';
import useFilters from '../../hooks/useFilters';
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
  if (state && state.message) {
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

export default function TrainingReports({ match }) {
  const {
    params: { status },
  } = match;
  const { user } = useContext(UserContext);
  const [error, updateError] = useState();
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [displayEvents, setDisplayEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
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

  // the page is tied to the status tab and filters it was chosen for,
  // so switching tabs or changing filters starts back on page 1
  const [pageState, setPageState] = useState({ status, filters, activePage: 1 });
  const activePage =
    pageState.status === status && pageState.filters === filters ? pageState.activePage : 1;
  const offset = (activePage - 1) * EVENTS_PER_PAGE;

  const handlePageChange = (pageNumber) => {
    setPageState({ status, filters, activePage: pageNumber });
  };

  useEffect(() => {
    let ignore = false;
    async function fetchEvents() {
      setAppLoadingText('Fetching events...');
      setIsAppLoading(true);
      const filterQuery = filtersToQueryString(expandFilters(filters));
      const pageQuery = `limit=${EVENTS_PER_PAGE}&offset=${offset}`;
      const query = filterQuery ? `${filterQuery}&${pageQuery}` : pageQuery;
      try {
        const { count, rows } = await getEventsByStatus(status, query);
        if (ignore) {
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
  }, [status, user.homeRegionId, setAppLoadingText, setIsAppLoading, filters, offset]);

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
    // update the UI, exclude the deleted event.
    const events = displayEvents.map((e) => ({ ...e })).filter((e) => e.id !== id);

    // update the events state.
    setDisplayEvents(events);
    setTotalCount((count) => Math.max(count - 1, 0));

    // if that emptied the page, step back to the previous one
    if (events.length === 0 && activePage > 1) {
      handlePageChange(activePage - 1);
    }
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
        <>
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
                showPagingBottom={totalCount > 0}
                currentPage={activePage}
                totalCount={totalCount}
                offset={offset}
                perPage={EVENTS_PER_PAGE}
                handlePageChange={handlePageChange}
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
        </>
      </div>
    </StaffProvider>
  );
}

TrainingReports.propTypes = {
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

TrainingReports.defaultProps = {
  user: null,
};
