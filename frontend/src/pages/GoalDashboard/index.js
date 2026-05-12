import { Alert } from '@trussworks/react-uswds';
import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import FilterPanel from '../../components/filter/FilterPanel';
import FilterPanelContainer from '../../components/filter/FilterPanelContainer';
import { fetchGoalDashboardData } from '../../fetchers/goals';
import useFilters from '../../hooks/useFilters';
import useFetch from '../../hooks/useFetch';
import UserContext from '../../UserContext';
import GoalStatusReasonSankeyWidget from '../../widgets/GoalStatusReasonSankeyWidget';
import { GOAL_DASHBOARD_FILTER_CONFIG, GOAL_DASHBOARD_FILTER_KEY } from './constants';
import GoalDashboardGoalsSection from './GoalDashboardGoalsSection';

export default function GoalDashboard() {
  const { user } = useContext(UserContext);
  const {
    filters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
    regions,
  } = useFilters(user, GOAL_DASHBOARD_FILTER_KEY, false, [], GOAL_DASHBOARD_FILTER_CONFIG);

  const {
    data: goalStatusWithReasons,
    error,
    loading,
  } = useFetch(null, fetchGoalDashboardData, [], 'Unable to fetch goal dashboard data');

  return (
    <div className="ttahub-goal-dashboard">
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
        />
      </FilterPanelContainer>
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
