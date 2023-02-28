import React, {
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
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
import { expandFilters, filtersToQueryString } from '../../utils';
import './index.scss';
import fetchResourceData from '../../fetchers/Resources';

import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';

const FILTER_KEY = 'regional-resources-dashboard-filters';
export default function ResourcesDashboard() {
  const { user } = useContext(UserContext);
  const ariaLiveContext = useContext(AriaLiveContext);
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);
  const [isLoading, setIsLoading] = useState(false);
  const [resourcesData, setResourcesData] = useState({});
  const [error, updateError] = useState();

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(
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

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to resources`);
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
      <Helmet titleTemplate="%s - Resources Dashboard - TTA Hub" defaultTitle="TTA Hub - Resources Dashboard" />
      <>
        <Helmet titleTemplate="%s - Resources Dashboard - TTA Hub" defaultTitle="TTA Hub - Resources Dashboard" />
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
        <Grid className="ttahub-resources-dashboard--filters display-flex flex-wrap flex-align-center margin-y-2">
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
      </>
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
