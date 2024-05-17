/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, {
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import FilterPanel from '../../components/filter/FilterPanel';
import { allRegionsUserHasPermissionTo } from '../../permissions';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import AriaLiveContext from '../../AriaLiveContext';
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview';
import ResourceUse from '../../widgets/ResourceUse';
import { expandFilters, filtersToQueryString, formatDateRange } from '../../utils';
import './index.scss';
import { fetchFlatResourceData } from '../../fetchers/Resources';
import {
  downloadReports,
  getReportsViaIdPost,
} from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers';
import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import { REPORTS_PER_PAGE } from '../../Constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import ResourcesAssociatedWithTopics from '../../widgets/ResourcesAssociatedWithTopics';
import ReportsTable from '../../components/ActivityReportsTable/ReportsTable';
import useSessionSort from '../../hooks/useSessionSort';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

const FILTER_KEY = 'regional-resources-dashboard-filters';

export default function ResourcesDashboard() {
  const { user } = useContext(UserContext);
  const ariaLiveContext = useContext(AriaLiveContext);
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);
  const [isLoading, setIsLoading] = useState(false);
  const [areReportsLoading, setAreReportsLoading] = useState(false);
  const [resourcesData, setResourcesData] = useState({});
  const [error, updateError] = useState();
  const [resetPagination, setResetPagination] = useState(false);
  const [activityReports, setActivityReports] = useState({
    count: 0,
    rows: [],
  });
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);

  const [activityReportSortConfig, setActivityReportSortConfig] = useSessionSort({
    sortBy: 'updatedAt',
    direction: 'desc',
    activePage: 1,
  }, 'resource-dashboard-activity-report-sort');

  const { activePage } = activityReportSortConfig;

  const [activityReportOffset, setActivityReportOffset] = useState(
    (activePage - 1) * REPORTS_PER_PAGE,
  );

  const getFiltersWithAllRegions = () => {
    const filtersWithAllRegions = [...allRegionsFilters];
    return filtersWithAllRegions;
  };
  const centralOfficeWithAllRegionFilters = getFiltersWithAllRegions();

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return [...centralOfficeWithAllRegionFilters,
        {
          id: uuidv4(),
          topic: 'startDate',
          condition: 'is within',
          query: defaultDate,
        }];
    }

    return [
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      },
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ];
  }, [defaultRegion, hasCentralOffice, centralOfficeWithAllRegionFilters]);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    defaultFilters,
  );

  const setFilters = useCallback((newFilters) => {
    setFiltersInHook(newFilters);
    setResetPagination(true);
    setActivityReportOffset(0);
    setActivityReportSortConfig({
      ...activityReportSortConfig,
      activePage: 1,
    });
  }, [activityReportSortConfig, setActivityReportSortConfig, setFiltersInHook]);

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

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
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

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to topics with resources `);
  };

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  const { reportIds } = resourcesData;

  useEffect(() => {
    async function fetchReports() {
      try {
        setAreReportsLoading(true);
        const data = await getReportsViaIdPost(
          resourcesData.reportIds,
          activityReportSortConfig.sortBy,
          activityReportSortConfig.direction,
          activityReportOffset,
          REPORTS_PER_PAGE,
        );
        setActivityReports(data);
        updateError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      } finally {
        setAreReportsLoading(false);
      }
    }

    if (resourcesData.reportIds && resourcesData.reportIds.length > 0) {
      fetchReports();
    }
  }, [
    activityReportOffset,
    activityReportSortConfig.direction,
    activityReportSortConfig.sortBy,
    resourcesData.reportIds,
  ]);

  useDeepCompareEffect(() => {
    async function fetcHResourcesData() {
      setIsLoading(true);
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const data = await fetchFlatResourceData(
          filterQuery,
        );
        setResourcesData(data);
        console.log('res data: ', data.topicUse);
        updateError('');
      } catch (e) {
        updateError('Unable to fetch resources');
      } finally {
        setIsLoading(false);
      }
    }
    // Call resources fetch.
    fetcHResourcesData();
  }, [
    filtersToApply,
  ]);

  const handleDownloadReports = async (setIsDownloading, setDownloadError, url, buttonRef) => {
    try {
      setIsDownloading(true);
      const blob = await downloadReports(url);
      const csv = URL.createObjectURL(blob);
      window.location.assign(csv);
    } catch (err) {
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
      buttonRef.current.focus();
    }
  };

  const handleDownloadAllReports = async (
    setIsDownloading,
    setDownloadError,
    downloadAllButtonRef,
  ) => {
    const queryString = reportIds.map((i) => `id=${i}`).join('&');
    const downloadURL = getAllReportsDownloadURL(queryString);

    return handleDownloadReports(
      setIsDownloading,
      setDownloadError,
      downloadURL,
      downloadAllButtonRef,
    );
  };

  const handleDownloadClick = async (
    reportCheckboxes,
    setIsDownloading,
    setDownloadError,
    downloadSelectedButtonRef,
  ) => {
    const toDownloadableReportIds = (accumulator, entry) => {
      if (!activityReports.rows) return accumulator;
      const [key, value] = entry;
      if (value === false) return accumulator;
      accumulator.push(key);
      return accumulator;
    };

    const downloadable = Object.entries(reportCheckboxes).reduce(toDownloadableReportIds, []);
    if (downloadable.length) {
      const downloadURL = getReportsDownloadURL(downloadable);
      await handleDownloadReports(
        setIsDownloading,
        setDownloadError,
        downloadURL,
        downloadSelectedButtonRef,
      );
    }
  };

  return (
    <div className="ttahub-resources-dashboard">
      <Helmet>
        <title>Resource Dashboard</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <h1 className="landing">
        Resource dashboard
      </h1>
      <Grid row>
        {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
        )}
      </Grid>
      <Grid className="ttahub-resources-dashboard--filters display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters for resources dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={RESOURCES_DASHBOARD_FILTER_CONFIG}
          allUserRegions={regions}
        />
      </Grid>
      <ResourcesDashboardOverview
        data={resourcesData.resourcesDashboardOverview}
        loading={isLoading}
        fields={[
          'Reports with resources',
          'ECLKC Resources',
          'Recipients reached',
          'Participants reached',
        ]}
        showTooltips
      />
      <ResourceUse
        data={resourcesData.resourcesUse}
        loading={isLoading}
      />
      <ResourcesAssociatedWithTopics
        data={resourcesData.topicUse}
        loading={isLoading}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
      />
      <ReportsTable
        loading={areReportsLoading}
        reports={activityReports.rows}
        sortConfig={activityReportSortConfig}
        handleDownloadAllReports={handleDownloadAllReports}
        handleDownloadClick={handleDownloadClick}
        setSortConfig={setActivityReportSortConfig}
        offset={activityReportOffset}
        setOffset={setActivityReportOffset}
        tableCaption="Activity Reports"
        exportIdPrefix="activity-reports"
        reportsCount={activityReports.count}
        activePage={activePage}
      />

    </div>
  );
}

ResourcesDashboard.propTypes = {
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

ResourcesDashboard.defaultProps = {
  user: null,
};
