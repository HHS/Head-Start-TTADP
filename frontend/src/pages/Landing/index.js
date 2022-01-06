/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Grid, Button,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Link, useHistory } from 'react-router-dom';
import AriaLiveContext from '../../AriaLiveContext';
import { getReportAlerts, downloadReports } from '../../fetchers/activityReports';
import { getAllAlertsDownloadURL } from '../../fetchers/helpers';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import MyAlerts from './MyAlerts';
import { hasReadWrite, allRegionsUserHasPermissionTo } from '../../permissions';
import { ALERTS_PER_PAGE } from '../../Constants';
import { filtersToQueryString, expandFilters } from '../../utils';
import Overview from '../../widgets/Overview';
import './TouchPoints.css';
import ActivityReportsTable from '../../components/ActivityReportsTable';
import FilterPanel from '../../components/filter/FilterPanel';
import useUrlFilters from '../../hooks/useUrlFilters';
import { formatDateRange } from '../../components/DateRangeSelect';

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

function Landing({ user }) {
  // Determine Default Region.
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;

  const [filters, setFilters] = useUrlFilters(
    defaultRegion !== 14
      && defaultRegion !== 0
      ? [{
        id: uuidv4(),
        topic: 'region',
        condition: 'Is',
        query: defaultRegion,
      },
      ] : [],
  );

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
  const [isDownloadingAlerts, setIsDownloadingAlerts] = useState(false);
  const [downloadAlertsError, setDownloadAlertsError] = useState(false);
  const downloadAllAlertsButtonRef = useRef();

  function getAppliedRegion() {
    const regionFilters = filters.filter((f) => f.topic === 'region').map((r) => r.query);
    if (regionFilters && regionFilters.length > 0) {
      return regionFilters[0];
    }
    return null;
  }

  const appliedRegionNumber = getAppliedRegion();

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

  const handleDownloadAllAlerts = async () => {
    const filterQuery = filtersToQueryString(filters);
    const downloadURL = getAllAlertsDownloadURL(filterQuery);

    try {
      setIsDownloadingAlerts(true);
      const blob = await downloadReports(downloadURL);
      const csv = URL.createObjectURL(blob);
      window.location.assign(csv);
    } catch (e) {
      setDownloadAlertsError(true);
    } finally {
      setIsDownloadingAlerts(false);
      downloadAllAlertsButtonRef.current.focus();
    }
  };

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  useEffect(() => {
    async function fetchAlertReports() {
      setAlertsLoading(true);
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filtersToApply);
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
  }, [alertsSortConfig, alertsOffset, alertsPerPage, filtersToApply]);

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

  const regionLabel = appliedRegionNumber === null || appliedRegionNumber === 14 ? 'All regions' : `Region ${appliedRegionNumber.toString()}`;

  // Apply filters.
  const onApply = (newFilters) => {
    setFilters([
      ...newFilters,
    ]);
    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`);
  };

  // Remove Filters.
  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  const dateRangeOptions = [
    {
      label: 'Last 30 days',
      value: 1,
      range: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
    },
    {
      label: 'Custom date range',
      value: 2,
      range: '',
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
            <h1 className="landing">{`Activity reports - ${regionLabel}`}</h1>
          </Grid>
          <Grid className="grid-col-2 flex-align-self-center">
            {reportAlerts
              && reportAlerts.length > 0
              && hasReadWrite(user)
              && appliedRegionNumber !== 14
              && <NewReport />}
          </Grid>
          <Grid col={12} className="display-flex flex-wrap margin-bottom-2">
            <FilterPanel
              applyButtonAria="apply filters for activity reports"
              filters={filters}
              onApplyFilters={onApply}
              dateRangeOptions={dateRangeOptions}
              onRemoveFilter={onRemoveFilter}
            />
          </Grid>
        </Grid>
        <Grid row gap className="smart-hub--overview">
          <Grid col={10}>
            <Overview
              tableCaption="TTA overview"
              filters={filtersToApply}
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
          updateReportAlerts={updateReportAlerts}
          setAlertReportsCount={setAlertReportsCount}
          handleDownloadAllAlerts={handleDownloadAllAlerts}
          message={message}
          isDownloadingAlerts={isDownloadingAlerts}
          downloadAlertsError={downloadAlertsError}
          downloadAllAlertsButtonRef={downloadAllAlertsButtonRef}
        />
        <ActivityReportsTable
          filters={filtersToApply}
          showFilter={false}
          tableCaption="Approved activity reports"
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
