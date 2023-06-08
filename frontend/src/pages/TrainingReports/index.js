import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Link, useHistory } from 'react-router-dom';
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
import { getEventsByStatus } from '../../fetchers/trainingReports';
import AppLoadingContext from '../../AppLoadingContext';
import { EVENT_STATUS } from './constants';

const tabValues = [
  { key: 'Not started', value: EVENT_STATUS.NOT_STARTED },
  { key: 'In progress', value: EVENT_STATUS.IN_PROGRESS },
  { key: 'Completed', value: EVENT_STATUS.COMPLETE }];
export default function TrainingReports({ match }) {
  const { params: { status } } = match;
  const { user } = useContext(UserContext);
  const [error, updateError] = useState();
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [displayEvents, setDisplayEvents] = useState([]);
  useEffect(() => {
    async function fetchEvents() {
      setAppLoadingText('Fetching events...');
      setIsAppLoading(true);
      // const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const events = await getEventsByStatus(status);
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
  }, [status, user.homeRegionId, setAppLoadingText, setIsAppLoading]);

  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;

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
        You successfully
        {' '}
        {message.status}
        {' '}
        training report
        {' '}
        <Link to={`/session-reports/${message.reportId}`}>
          {message.displayId}
        </Link>
        {' '}
        on
        {' '}
        {message.time}
      </>
    );
  }

  return (
    <div className="ttahub-training-reports">
      <Helmet titleTemplate="%s - Training Reports - TTA Hub" defaultTitle="TTA Hub - Training Reports" />
      <>
        {showAlert && message && (
          <Alert
            type="success"
            role="alert"
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
          <Grid row>
            <WidgetContainer
              title="Events"
              loading={false}
              loadingLabel="Training events loading"
              showPaging={false}
              showHeaderBorder={false}
            >
              <Tabs tabs={tabValues} ariaLabel="Training events" />
              <EventCards events={displayEvents} />
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
