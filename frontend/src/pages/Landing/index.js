/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState, useEffect, useContext,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Grid, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import { Link, useHistory } from 'react-router-dom';

import AriaLiveContext from '../../AriaLiveContext';
import { getReportAlerts } from '../../fetchers/activityReports';
import { getAllAlertsDownloadURL } from '../../fetchers/helpers';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import MyAlerts from './MyAlerts';
import { hasReadWrite, allRegionsUserHasPermissionTo } from '../../permissions';
import { ALERTS_PER_PAGE } from '../../Constants';
import { filtersToQueryString } from '../../utils';
import Overview from '../../widgets/Overview';
import RegionalSelect from '../../components/RegionalSelect';
import './TouchPoints.css';
import ActivityReportsTable from '../../components/ActivityReportsTable';

export function renderTotal(offset, perPage, activePage, reportsCount) {
  const from = offset >= reportsCount ? 0 : offset + 1;
  const offsetTo = perPage * activePage;
  let to;
  if (offsetTo > reportsCount) {
    to = reportsCount;
  } else {
    to = offsetTo;
  }
  return `${from}-${to} of ${reportsCount}`;
}

function regionFilter(regionId) {
  return {
    topic: 'region',
    condition: 'Contains',
    query: regionId.toString(),
  };
}

function Landing({ user }) {
  const regions = allRegionsUserHasPermissionTo(user);
  const history = useHistory();
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [reportAlerts, updateReportAlerts] = useState([]);
  const [error, updateError] = useState();
  const [showAlert, updateShowAlert] = useState(true);

  const [alertsSortConfig, setAlertsSortConfig] = React.useState({
    sortBy: 'startDate',
    direction: 'desc',
  });
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [alertsPerPage] = useState(ALERTS_PER_PAGE);
  const [alertsActivePage, setAlertsActivePage] = useState(1);
  const [alertReportsCount, setAlertReportsCount] = useState(0);
  const [alertFilters, setAlertFilters] = useState([]);

  const defaultRegion = regions[0] || user.homeRegionId || 0;

  const [
    appliedRegion,
    updateAppliedRegion,
  ] = useState(user.homeRegionId === 14 ? 14 : defaultRegion);
  const [filters, setFilters] = useState([
    regionFilter(appliedRegion),
  ]);

  const [regionLabel, setRegionLabel] = useState('');
  const ariaLiveContext = useContext(AriaLiveContext);

  const requestAlertsSort = (sortBy) => {
    let direction = 'asc';
    if (
      alertsSortConfig
      && alertsSortConfig.sortBy === sortBy
      && alertsSortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setAlertsActivePage(1);
    setAlertsOffset(0);
    setAlertsSortConfig({ sortBy, direction });
  };

  const onApplyRegion = (region) => {
    const regionId = region ? region.value : appliedRegion;
    const filtersToApply = filters.filter((f) => f.topic !== 'region');
    filtersToApply.push(
      regionFilter(regionId),
    );

    setFilters(filtersToApply);
    updateAppliedRegion(regionId);
  };

  // Update ariaLiveContext outside of effects to avoid infinite re-renders and
  // the initial "0 filters applied" on first render
  const handleApplyFilters = (newFilters) => {
    setFilters([...newFilters, regionFilter(appliedRegion)]);
    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`);
  };

  const handleApplyAlertFilters = (newFilters) => {
    setAlertFilters(newFilters);
    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to my alerts`);
  };

  const handleDownloadAllAlerts = () => {
    const filterQuery = filtersToQueryString(alertFilters, appliedRegion);
    const downloadURL = getAllAlertsDownloadURL(filterQuery);
    window.location.assign(downloadURL);
  };

  useEffect(() => {
    async function fetchAlertReports() {
      setAlertsLoading(true);
      const filterQuery = filtersToQueryString(alertFilters, appliedRegion);
      try {
        const { alertsCount, alerts } = await getReportAlerts(
          alertsSortConfig.sortBy,
          alertsSortConfig.direction,
          alertsOffset,
          alertsPerPage,
          filterQuery,
        );
        updateReportAlerts(alerts);
        if (alertsCount) {
          setAlertReportsCount(alertsCount);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setAlertsLoading(false);
    }
    fetchAlertReports();
  }, [alertsSortConfig, alertsOffset, alertsPerPage, alertFilters, appliedRegion]);

  useEffect(() => {
    setRegionLabel(appliedRegion === 14 ? 'All' : appliedRegion.toString());
  }, [appliedRegion]);

  let msg;
  const message = history.location.state && history.location.state.message;
  if (message) {
    msg = (
      <>
        You successfully
        {' '}
        {message.status}
        {' '}
        report
        {' '}
        <Link to={`/activity-reports/${message.reportId}`}>
          {message.displayId}
        </Link>
        {' '}
        on
        {' '}
        {message.time}
      </>
    );
  }

  const overviewFilters = [
    {
      topic: 'region',
      condition: 'Contains',
      query: appliedRegion,
    },
    {
      topic: 'startDate',
      condition: 'Is after',
      query: '2020/08/31',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Landing</title>
      </Helmet>
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
                  <FontAwesomeIcon color="black" icon={faTimesCircle} />
                </span>
              </Button>
            )}
          >
            {msg}
          </Alert>
        )}
        <Grid row gap>
          <Grid>
            <h1 className="landing">Activity Reports</h1>
          </Grid>
          <Grid col={2} className="flex-align-self-center">
            {regions.length > 1
              && (
                <RegionalSelect
                  regions={allRegionsUserHasPermissionTo(user)}
                  onApply={onApplyRegion}
                  appliedRegion={appliedRegion}
                  hasCentralOffice={user.homeRegionId === 14}
                />
              )}
          </Grid>
          <Grid className="flex-align-self-center">
            {reportAlerts
              && reportAlerts.length > 0
              && hasReadWrite(user)
              && appliedRegion !== 14
              && <NewReport />}
          </Grid>
        </Grid>
        <Grid row gap className="smart-hub--overview">
          <Grid col={10}>
            <Overview
              filters={overviewFilters}
              regionLabel={regionLabel}
            />
          </Grid>
        </Grid>
        <Grid row>
          {error && (
            <Alert type="error" role="alert">
              {error}
            </Alert>
          )}
        </Grid>
        <MyAlerts
          loading={alertsLoading}
          reports={reportAlerts}
          newBtn={hasReadWrite(user)}
          alertsSortConfig={alertsSortConfig}
          alertsOffset={alertsOffset}
          alertsPerPage={alertsPerPage}
          alertsActivePage={alertsActivePage}
          alertReportsCount={alertReportsCount}
          sortHandler={requestAlertsSort}
          updateReportFilters={handleApplyAlertFilters}
          hasFilters={alertFilters.length > 0}
          updateReportAlerts={updateReportAlerts}
          setAlertReportsCount={setAlertReportsCount}
          handleDownloadAllAlerts={handleDownloadAllAlerts}
          message={message}
        />
        <ActivityReportsTable
          filters={filters}
          showFilter
          onUpdateFilters={handleApplyFilters}
          tableCaption={`Region ${regionLabel} Activity reports`}
        />
      </>
    </>
  );
}

Landing.propTypes = {
  user: PropTypes.shape({
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};

export default Landing;
