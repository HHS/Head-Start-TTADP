import React, {
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import FilterPanel from '../../components/filter/FilterPanel';
import { allRegionsUserHasPermissionTo } from '../../permissions';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import AriaLiveContext from '../../AriaLiveContext';
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview';
import ResourceUse from '../../widgets/ResourceUse';
import { expandFilters, filtersToQueryString, formatDateRange } from '../../utils';
import './index.scss';
import { fetchResourceData } from '../../fetchers/Resources';

import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import ResourcesAssociatedWithTopics from '../../widgets/ResourcesAssociatedWithTopics';

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
  const [resourcesData, setResourcesData] = useState({});
  const [error, updateError] = useState();
  const [resetPagination, setResetPagination] = useState(false);
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);

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
  }, [setFiltersInHook]);

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

  useEffect(() => {
    async function fetcHResourcesData() {
      setIsLoading(true);
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const data = await fetchResourceData(
          filterQuery,
        );
        setResourcesData(data);
        updateError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch resources');
      } finally {
        setIsLoading(false);
      }
    }
    // Call resources fetch.
    fetcHResourcesData();
  }, [filtersToApply]);

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
