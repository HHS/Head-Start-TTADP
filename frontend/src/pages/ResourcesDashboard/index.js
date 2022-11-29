import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import FilterPanel from '../../components/filter/FilterPanel';
import ResourceList from '../../widgets/ResourceList';
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview';
import { getUserRegions } from '../../permissions';
import './index.scss';
import { formatDateRange, expandFilters } from '../../utils';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import UserContext from '../../UserContext';
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const FILTER_KEY = 'regional-resources-dashboard-filters';
export default function ResourcesDashboard() {
  const { user } = useContext(UserContext);

  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const defaultRegion = useMemo(() => regions[0].toString(), [regions]);

  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const getFiltersWithAllRegions = () => {
    const filtersWithAllRegions = [...allRegionsFilters];
    filtersWithAllRegions.push({
      id: uuidv4(),
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    });
    return filtersWithAllRegions;
  };

  const centralOfficeWithAllRegionFilters = getFiltersWithAllRegions();

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return centralOfficeWithAllRegionFilters;
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

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(FILTER_KEY, defaultFilters);

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters(newFilters);
    }
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

  const filtersToApply = expandFilters(filters);

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
          Resources dashboard
        </h1>
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
        <GridContainer className="margin-0 padding-0">
          <ResourcesDashboardOverview
            filters={filtersToApply}
            fields={[
              'ECLKC resources',
              'Non ECLKC resources',
              'No resources',
            ]}
            showTooltips
          />
          <Grid>
            <ResourceList
              filters={filtersToApply}
            />
          </Grid>
        </GridContainer>
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
