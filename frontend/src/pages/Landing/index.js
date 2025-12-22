/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Alert, Grid,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import AriaLiveContext from '../../AriaLiveContext';
import UserContext from '../../UserContext';
import { getReportAlerts, downloadReports } from '../../fetchers/activityReports';
import { getAllAlertsDownloadURL } from '../../fetchers/helpers';
import MyAlerts from './MyAlerts';
import { hasReadWrite, allRegionsUserHasActivityReportPermissionTo, hasApproveActivityReport } from '../../permissions';
import {
  ALERTS_PER_PAGE,
} from '../../Constants';
import { filtersToQueryString, expandFilters } from '../../utils';
import DashboardOverview from '../../widgets/DashboardOverview';
import ActivityReportsTable from '../../components/ActivityReportsTable';
import FilterPanel from '../../components/filter/FilterPanel';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import { LANDING_FILTER_CONFIG } from './constants';
import FilterContext from '../../FilterContext';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { specialistNameFilter } from '../../components/filter/activityReportFilters';
import NewActivityReportButton from '../../components/NewActivityReportButton';
import LandingMessage from '../../components/LandingMessage';
import './index.scss';

const FILTER_KEY = 'landing-filters';

export function getAppliedRegion(filters) {
  const regionFilters = filters.filter((f) => f.topic === 'region').map((r) => r.query);
  if (regionFilters && regionFilters.length > 0) {
    return regionFilters[0];
  }
  return null;
}

function Landing() {
  const { user } = useContext(UserContext);

  // Determine Default Region.
  const regions = allRegionsUserHasActivityReportPermissionTo(user);
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

  const [alertsLoading, setAlertsLoading] = useState(true);
  const [reportAlerts, updateReportAlerts] = useState([]);
  const [error, updateError] = useState();
  const [resetPagination, setResetPagination] = useState(false);

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

  const appliedRegionNumber = getAppliedRegion(filters);

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
      if (downloadAllAlertsButtonRef.current) {
        downloadAllAlertsButtonRef.current.focus();
      }
    }
  };

  const setFilters = useCallback((newFilters) => {
    // pass through
    setFiltersInHook(newFilters);

    // reset pagination
    setAlertsActivePage(1);
    setAlertsOffset(0);
    setResetPagination(true);
  }, [setFiltersInHook]);

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
        updateError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setAlertsLoading(false);
    }
    fetchAlertReports();
  }, [alertsSortConfig, alertsOffset, alertsPerPage, filtersToApply]);

  const regionLabel = () => {
    if (defaultRegion === 14 || hasMultipleRegions) {
      return 'your regions';
    }
    return 'your region';
  };

  // Apply filters.
  const onApply = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters([
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
        setFilters([...allRegionsFilters, ...newFilters]);
      } else {
        setFilters(newFilters);
      }
    }
  };

  const filtersToUse = useMemo(() => {
    const filterConfig = LANDING_FILTER_CONFIG(hasMultipleRegions);

    // If user has approve activity report permission add 'Specialist name' filter.
    if (hasApproveActivityReport(user)) {
      filterConfig.push(specialistNameFilter);
      filterConfig.sort((a, b) => a.display.localeCompare(b.display));
    }
    return filterConfig;
  }, [hasMultipleRegions, user]);

  return (
    <>
      <Helmet>
        <title>Activity Reports</title>
      </Helmet>
      <>
        <RegionPermissionModal
          filters={filters}
          user={user}
          showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
        />
        <LandingMessage />
        <Grid row gap>
          <Grid col={12} className="display-flex flex-wrap">
            <h1 className="landing margin-top-0 margin-bottom-3 margin-right-2">{`Activity reports - ${regionLabel()}`}</h1>
            <div className="margin-bottom-2">
              {reportAlerts
              && reportAlerts.length > 0
              && hasReadWrite(user)
              && appliedRegionNumber !== 14
              && (
              <NewActivityReportButton />
              )}
            </div>
          </Grid>
          <Grid col={12} className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
            <FilterPanel
              applyButtonAria="apply filters for activity reports"
              filters={filters}
              onApplyFilters={onApply}
              onRemoveFilter={onRemoveFilter}
              filterConfig={filtersToUse}
              allUserRegions={regions}
            />
          </Grid>
        </Grid>
        <DashboardOverview
          filters={filtersToApply}
          fields={[
            'Grants served',
            'Activity reports',
            'Participants',
            'Hours of TTA',
          ]}
          showTooltips
        />
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
          isDownloadingAlerts={isDownloadingAlerts}
          downloadAlertsError={downloadAlertsError}
          setDownloadAlertsError={setDownloadAlertsError}
          downloadAllAlertsButtonRef={downloadAllAlertsButtonRef}
        />
        <FilterContext.Provider value={{ filterKey: FILTER_KEY }}>
          <ActivityReportsTable
            filters={filtersToApply}
            showFilter={false}
            tableCaption="Approved activity reports"
            exportIdPrefix="ar-"
            resetPagination={resetPagination}
            setResetPagination={setResetPagination}
          />
        </FilterContext.Provider>
      </>
    </>
  );
}

export default Landing;
