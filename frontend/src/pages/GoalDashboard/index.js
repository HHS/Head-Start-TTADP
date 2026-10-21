import { Alert } from '@trussworks/react-uswds';
import React, { useContext, useRef } from 'react';
import { Helmet } from 'react-helmet';
import ContentFromFeedByTag from '../../components/ContentFromFeedByTag';
import Drawer from '../../components/Drawer';
import DrawerTriggerButton from '../../components/DrawerTriggerButton';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { fetchGoalDashboardData } from '../../fetchers/goals';
import useFetch from '../../hooks/useFetch';
import useFilters from '../../hooks/useFilters';
import UserContext from '../../UserContext';
import { filtersToQueryString } from '../../utils';
import GoalStatusReasonSankeyWidget from '../../widgets/GoalStatusReasonSankeyWidget';
import { showFilterWithMyRegions } from '../regionHelpers';
import { GOAL_DASHBOARD_FILTER_CONFIG, GOAL_DASHBOARD_FILTER_KEY } from './constants';
import GoalDashboardGoalsSection from './GoalDashboardGoalsSection';

export default function GoalDashboard() {
  const pageDrawerRef = useRef(null);
  const { user } = useContext(UserContext);
  const {
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
    regions,
    allRegionsFilters,
  } = useFilters(user, GOAL_DASHBOARD_FILTER_KEY, true, [], GOAL_DASHBOARD_FILTER_CONFIG);

  const filterQuery = filtersToQueryString(filters);

  const {
    data: goalStatusWithReasons,
    error,
    loading,
  } = useFetch(
    null,
    () => fetchGoalDashboardData(filterQuery),
    [filterQuery],
    'Unable to fetch goal dashboard data'
  );

  return (
    <div className="ttahub-goal-dashboard">
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={() =>
          showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <Helmet>
        <title>Goal Dashboard</title>
      </Helmet>
      <h1 className="landing margin-top-0 margin-bottom-3">Goal dashboard</h1>
      {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
      )}
      <FilterPanelContainer>
        <FilterPanel
          applyButtonAria="apply filters for goal dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filterConfig}
          allUserRegions={regions}
          manageRegions={false}
        />
      </FilterPanelContainer>
      <div className="margin-bottom-3">
        <DrawerTriggerButton drawerTriggerRef={pageDrawerRef}>
          Learn how filters impact the data displayed
        </DrawerTriggerButton>
        <Drawer title="Filter guidance" triggerRef={pageDrawerRef}>
          <ContentFromFeedByTag tagName="ttahub-goal-dash-filters" />
        </Drawer>
      </div>
      {(goalStatusWithReasons || loading) && (
        <GoalStatusReasonSankeyWidget data={goalStatusWithReasons} loading={loading} />
      )}
      {goalStatusWithReasons && (
        <GoalDashboardGoalsSection
          dataStartDateDisplay={goalStatusWithReasons.dataStartDateDisplay}
          filters={filters}
        />
      )}
    </div>
  );
}
