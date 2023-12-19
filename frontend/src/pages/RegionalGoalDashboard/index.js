import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import { getUserRegions } from '../../permissions';
import UserContext from '../../UserContext';
import { expandFilters, formatDateRange } from '../../utils';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import { DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import FilterPanel from '../../components/filter/FilterPanel';
import GoalsPercentage from '../../widgets/RegionalGoalDashboard/GoalsPercentage';
import GoalStatusChart from '../../widgets/RegionalGoalDashboard/GoalStatusChart';
import TotalHrsAndRecipientGraphWidget from '../../widgets/TotalHrsAndRecipientGraph';
import TopicsTable from '../../widgets/RegionalGoalDashboard/TopicsTable';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
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

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFiltersInHook([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFiltersInHook(newFilters);
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
        setFiltersInHook([...allRegionsFilters, ...newFilters]);
      } else {
        setFiltersInHook(newFilters);
      }
    }
  };

  const filtersToApply = expandFilters(filters);

  return (
    <div className="ttahub-dashboard">
      <Helmet>
        <title>Goal Dashboard</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFiltersInHook)
        }
      />
      <h1 className="landing margin-top-0 margin-bottom-3">
        {userHasOnlyOneRegion ? `Region ${defaultRegion}` : 'Regional'}
        {' '}
        Goal Dashboard
      </h1>
      <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters for regional dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={DASHBOARD_FILTER_CONFIG}
          allUserRegions={regions}
        />
      </Grid>
      <GridContainer className="margin-0 padding-0">
        <GoalsPercentage
          filters={filtersToApply}
        />
      </GridContainer>
      <Grid row gap="lg">
        <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }} className="display-flex flex-align-stretch">
          <GoalStatusChart filters={filtersToApply} />
        </Grid>
        <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
          <TotalHrsAndRecipientGraphWidget hideYAxis filters={filtersToApply} />
        </Grid>
      </Grid>
      <GridContainer className="margin-y-0 padding-0">
        <TopicsTable
          filters={filtersToApply}
        />
      </GridContainer>
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
