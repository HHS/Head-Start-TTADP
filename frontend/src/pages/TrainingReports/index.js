import React, {
  useContext, useState, useEffect, useMemo,
} from 'react';
import { TRAINING_REPORT_STATUSES_URL_PARAMS } from '@ttahub/common';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import './index.scss';
import {
  Alert, Grid, Button,
} from '@trussworks/react-uswds';
import { allRegionsUserHasPermissionTo } from '../../permissions';
import UserContext from '../../UserContext';
import colors from '../../colors';
import WidgetContainer from '../../components/WidgetContainer';
import Tabs from '../../components/Tabs';
import EventCards from './components/EventCards';
import { getEventsByStatus, deleteEvent } from '../../fetchers/event';
import { deleteSession } from '../../fetchers/session';
import AppLoadingContext from '../../AppLoadingContext';
import { TRAINING_REPORT_BASE_FILTER_CONFIG, TRAINING_REPORT_CONFIG_WITH_REGIONS } from './constants';
import AriaLiveContext from '../../AriaLiveContext';
import { filtersToQueryString, expandFilters } from '../../utils';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import FilterPanel from '../../components/filter/FilterPanel';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import RegionPermissionModal from '../../components/RegionPermissionModal';

const FILTER_KEY = 'training-report-filters';

const tabValues = Object.keys(TRAINING_REPORT_STATUSES_URL_PARAMS).map((status) => ({
  key: TRAINING_REPORT_STATUSES_URL_PARAMS[status], value: status,
}));

export default function TrainingReports({ match }) {
  const { params: { status } } = match;
  const { user } = useContext(UserContext);
  const [error, updateError] = useState();
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [displayEvents, setDisplayEvents] = useState([]);

  // Determine Default Region.
  const regions = allRegionsUserHasPermissionTo(user);
  const ariaLiveContext = useContext(AriaLiveContext);

  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;

  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    defaultRegion !== 14
      && defaultRegion !== 0
      && hasMultipleRegions
      ? [{
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      }]
      : allRegionsFilters,
  );

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  useEffect(() => {
    async function fetchEvents() {
      setAppLoadingText('Fetching events...');
      setIsAppLoading(true);
      const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const events = await getEventsByStatus(status, filterQuery);
        setDisplayEvents(events);
        updateError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch events');
      } finally {
        setIsAppLoading(false);
      }
    }
    fetchEvents();
  }, [status, user.homeRegionId, setAppLoadingText, setIsAppLoading, filtersToApply]);

  const [showAlert, updateShowAlert] = useState(true);

  const regionLabel = () => {
    if (defaultRegion === 14) {
      return 'all regions';
    }
    if (defaultRegion > 0) {
      return `region ${defaultRegion.toString()}`;
    }
    return '';
  };

  const history = useHistory();

  let msg;
  const message = history.location.state && history.location.state.message;

  if (message) {
    msg = (
      <>
        { message }
      </>
    );
  }

  // Apply filters.
  const onApply = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFiltersInHook([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFiltersInHook([
        ...newFilters,
      ]);
    }

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`);
  };

  // Remove Filters.
  const onRemoveFilter = (id, addBackDefaultRegions) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFiltersInHook([...allRegionsFilters, ...newFilters]);
      } else {
        setFiltersInHook(newFilters);
      }
    }
  };

  const filterConfig = hasMultipleRegions
    ? TRAINING_REPORT_CONFIG_WITH_REGIONS : TRAINING_REPORT_BASE_FILTER_CONFIG;

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

      // update the UI, exclude the deleted event.
      const events = displayEvents.map((e) => ({ ...e })).filter((e) => e.id !== id);

      // update the events state.
      setDisplayEvents(events);
    } catch (e) {
      updateError('Unable to delete event');
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  return (
    <div className="ttahub-training-reports">
      <Helmet titleTemplate="%s - Training Reports - TTA Hub" defaultTitle="TTA Hub - Training Reports" />
      <>
        <RegionPermissionModal
          filters={filters}
          user={user}
          showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFiltersInHook)
          }
        />
        {showAlert && message && (
          <Alert
            type="success"
            role="alert"
            className="margin-bottom-2"
            noIcon
            cta={(
              <Button
                role="button"
                unstyled
                aria-label="dismiss alert"
                onClick={() => updateShowAlert(false)}
              >
                <span className="fa-sm margin-right-2">
                  <FontAwesomeIcon color={colors.textInk} icon={faTimesCircle} />
                </span>
              </Button>
            )}
          >
            {msg}
          </Alert>
        )}
        <Helmet titleTemplate="%s - Training Reports - TTA Hub" defaultTitle="TTA Hub - Training Reports" />
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
          <Grid col={12} className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
            <FilterPanel
              applyButtonAria="apply filters for training reports"
              filters={filters}
              onApplyFilters={onApply}
              onRemoveFilter={onRemoveFilter}
              filterConfig={filterConfig}
              allUserRegions={regions}
            />
          </Grid>
          <Grid row>
            <WidgetContainer
              title="Events"
              loading={false}
              loadingLabel="Training events loading"
              showPaging={false}
              showHeaderBorder={false}
            >
              <Tabs tabs={tabValues} ariaLabel="Training events" />
              <EventCards
                events={displayEvents}
                eventType={status}
                onRemoveSession={onRemoveSession}
                onDeleteEvent={onDeleteEvent}
              />
            </WidgetContainer>
          </Grid>
        </Grid>
      </>
    </div>

  );
}

TrainingReports.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

TrainingReports.defaultProps = {
  user: null,
};
