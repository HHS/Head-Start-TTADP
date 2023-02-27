import React, { useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import { getUserRegions } from '../../permissions';
import UserContext from '../../UserContext';
import { expandFilters, formatDateRange } from '../../utils';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import './index.css';
import { DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import FilterPanel from '../../components/filter/FilterPanel';
import GoalsPercentage from '../../widgets/RegionalGoalDashboard/GoalsPercentage';
import GoalStatusGraph from '../../widgets/GoalStatusGraph';
import TotalHrsAndRecipientGraphWidget from '../../widgets/TotalHrsAndRecipientGraph';

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const FILTER_KEY = 'regional-goal-dashboard-filters';

// TODO: All of the filter logic was directly ripped from RegionalDashboard.
// This should be refactored.
export default function RegionalGoalDashboard() {
  const { user } = useContext(UserContext);
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);
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

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(FILTER_KEY, defaultFilters);

  const setFilters = useCallback((newFilters) => {
    setFiltersInHook(newFilters);
  }, [setFiltersInHook]);

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
    <div className="ttahub-dashboard">
      <Helmet titleTemplate="%s - Goal Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <h1 className="landing">
        {userHasOnlyOneRegion ? `Region ${defaultRegion}` : 'Regional'}
        {' '}
        Goal Dashboard
      </h1>
      <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center margin-y-2">
        <FilterPanel
          applyButtonAria="apply filters for regional dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={DASHBOARD_FILTER_CONFIG}
          allUserRegions={regions}
        />
      </Grid>
      <GridContainer className="margin-bottom-2 padding-0">
        <GoalsPercentage
          filters={filtersToApply}
        />
      </GridContainer>
      <Grid row>
        <Grid desktop={{ col: 4 }} tablet={{ col: 12 }} className="margin-top-2">
          <GoalStatusGraph filters={filtersToApply} />
        </Grid>
        <Grid desktop={{ col: 8 }} tabletLg={{ col: 12 }}>
          <TotalHrsAndRecipientGraphWidget hideYAxis filters={filtersToApply} />
        </Grid>
      </Grid>
    </div>
  );
}

RegionalGoalDashboard.propTypes = {
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

RegionalGoalDashboard.defaultProps = {
  user: null,
};
