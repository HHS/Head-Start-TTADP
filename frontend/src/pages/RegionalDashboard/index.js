import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { v4 as uuidv4 } from 'uuid';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import FilterPanel from '../../components/filter/FilterPanel';
import DashboardOverview from '../../widgets/DashboardOverview';
import TopicFrequencyGraph from '../../widgets/TopicFrequencyGraph';
import { getUserRegions } from '../../permissions';
import ReasonList from '../../widgets/ReasonList';
import TotalHrsAndRecipient from '../../widgets/TotalHrsAndRecipientGraph';
import './index.css';
import { expandFilters, formatDateRange } from '../../utils';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import ActivityReportsTable from '../../components/ActivityReportsTable';
import UserContext from '../../UserContext';
import FilterContext from '../../FilterContext';
import { DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const FILTER_KEY = 'regional-dashboard-filters';
export default function RegionalDashboard() {
  const { user } = useContext(UserContext);

  /**
   * we are going to memoize all this stuff so it doesn't get recomputed each time
   * this is re-rendered. it would (generally) only get recomputed should the user change
   */

  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);
  const defaultRegion = useMemo(() => regions[0].toString(), [regions]);

  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return [
        {
          id: uuidv4(),
          topic: 'startDate',
          condition: 'is within',
          query: defaultDate,
        },
      ];
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
  }, [defaultRegion, hasCentralOffice]);

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(FILTER_KEY, defaultFilters);

  const onApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  const filtersToApply = expandFilters(filters);

  return (
    <div className="ttahub-dashboard">
      <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
      <>
        <Helmet titleTemplate="%s - Dashboard - TTA Hub" defaultTitle="TTA Hub - Dashboard" />
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
          TTA Activity Dashboard
        </h1>
        <Grid className="ttahub-dashboard--filters display-flex flex-wrap flex-align-center margin-y-2">
          <FilterPanel
            applyButtonAria="apply filters for regional dashboard"
            filters={filters}
            onApplyFilters={onApplyFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={DASHBOARD_FILTER_CONFIG}
          />
        </Grid>
        <GridContainer className="margin-0 padding-0">
          <DashboardOverview
            filters={filtersToApply}
            fields={[
              'Recipients served',
              'Grants served',
              'Activity reports',
              'Participants',
              'Hours of TTA',
            ]}
            showTooltips
          />
          <Grid row gap={2}>
            <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
              <ReasonList
                filters={filtersToApply}
              />
            </Grid>
            <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
              <TotalHrsAndRecipient
                filters={filtersToApply}
              />
            </Grid>
          </Grid>
          <Grid row>
            <TopicFrequencyGraph
              filters={filtersToApply}
            />
          </Grid>
          <Grid row>
            <FilterContext.Provider value={{ filterKey: FILTER_KEY }}>
              <ActivityReportsTable
                filters={filtersToApply}
                showFilter={false}
                tableCaption="Activity reports"
              />
            </FilterContext.Provider>
          </Grid>
        </GridContainer>
      </>
    </div>

  );
}

RegionalDashboard.propTypes = {
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

RegionalDashboard.defaultProps = {
  user: null,
};
