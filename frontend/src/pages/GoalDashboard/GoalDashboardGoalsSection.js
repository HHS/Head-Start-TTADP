import { Alert, Dropdown, Label } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import PropTypes from 'prop-types';
import React from 'react';
import PaginationCard from '../../components/PaginationCard';
import WidgetContainer from '../../components/WidgetContainer';
import { fetchGoalDashboardGoals } from '../../fetchers/goals';
import useFetch from '../../hooks/useFetch';
import GoalDashboardGoalCards from './GoalDashboardGoalCards';
import './GoalDashboardGoalsSection.css';

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 50;

export const GOAL_DASHBOARD_SORT_OPTIONS = [
  { value: 'createdOn-desc', label: 'Date added (newest to oldest)' },
  { value: 'createdOn-asc', label: 'Date added (oldest to newest)' },
  { value: 'goalStatus-asc', label: 'Goal status (not started first)' },
  { value: 'goalStatus-desc', label: 'Goal status (closed first)' },
  { value: 'goalCategory-asc', label: 'Goal category (A-Z)' },
  { value: 'goalCategory-desc', label: 'Goal category (Z-A)' },
];

const DEFAULT_SORT_CONFIG = {
  sortBy: 'goalStatus',
  direction: 'asc',
  activePage: 1,
  offset: 0,
};

const parseSortValue = (value) => {
  const directionSeparatorIndex = value.lastIndexOf('-');

  if (directionSeparatorIndex === -1) {
    return {
      sortBy: value,
      direction: 'asc',
    };
  }

  return {
    sortBy: value.slice(0, directionSeparatorIndex),
    direction: value.slice(directionSeparatorIndex + 1),
  };
};

function GoalDashboardGoalsSection({ dataStartDateDisplay }) {
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState(DEFAULT_SORT_CONFIG);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const goalsQuery = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('sortBy', sortConfig.sortBy);
    params.set('direction', sortConfig.direction);
    params.set('offset', sortConfig.offset);
    params.set('perPage', perPage);
    params.set('skipCache', 'true');
    if (refreshKey > 0) params.set('_refresh', refreshKey);
    return params.toString();
  }, [perPage, refreshKey, sortConfig.direction, sortConfig.offset, sortConfig.sortBy]);

  const {
    data: dashboardGoals,
    setData: setDashboardGoals,
    error: dashboardGoalsError,
    loading: dashboardGoalsLoading,
  } = useFetch(
    null,
    () => fetchGoalDashboardGoals(goalsQuery),
    [goalsQuery],
    'Unable to fetch goal dashboard goals'
  );

  // Show cards whenever we have data, even if a subsequent refetch errored.
  // The error alert is rendered separately above the cards. This preserves
  // optimistic state (e.g. after a delete) when a backfill refetch fails.
  const hasDashboardGoals = Boolean(dashboardGoals);
  const goalsCount = hasDashboardGoals ? dashboardGoals.count : 0;
  const goalRows = hasDashboardGoals ? dashboardGoals.goalRows || [] : [];
  const allGoalIds = hasDashboardGoals ? dashboardGoals.allGoalIds || [] : [];
  const maxPage = React.useMemo(
    () => Math.max(Math.ceil(goalsCount / perPage), 1),
    [goalsCount, perPage]
  );

  const handleSortChange = (event) => {
    const { sortBy, direction } = parseSortValue(event.target.value);
    setSortConfig({
      sortBy,
      direction,
      activePage: 1,
      offset: 0,
    });
  };

  const handlePageChange = (pageNumber) => {
    setSortConfig((previousConfig) => ({
      ...previousConfig,
      activePage: pageNumber,
      offset: (pageNumber - 1) * perPage,
    }));
  };

  const handlePerPageChange = (event) => {
    const nextPerPage = parseInt(event.target.value, DECIMAL_BASE);
    const boundedPerPage = nextPerPage > 0 ? Math.min(nextPerPage, MAX_PER_PAGE) : DEFAULT_PER_PAGE;
    setPerPage(boundedPerPage);
    setSortConfig((previousConfig) => ({
      ...previousConfig,
      activePage: 1,
      offset: 0,
    }));
  };

  const handleGoalDeleted = (deletedGoalIds) => {
    setDashboardGoals((previousDashboardGoals) => {
      const goalIdsToDelete = new Set(deletedGoalIds);
      const previousRows = previousDashboardGoals?.goalRows || [];
      const previousAllGoalIds = previousDashboardGoals?.allGoalIds || [];
      const nextRows = previousRows.filter((goal) => !goalIdsToDelete.has(goal.id));
      const nextAllGoalIds = previousAllGoalIds.filter((goalId) => !goalIdsToDelete.has(goalId));

      return {
        ...previousDashboardGoals,
        count: Math.max((previousDashboardGoals?.count || 0) - deletedGoalIds.length, 0),
        goalRows: nextRows,
        allGoalIds: nextAllGoalIds,
      };
    });

    // If there are more goals beyond the current page after deletion, refetch to backfill.
    // The page-collapse case (activePage > maxPage) is handled by the useEffect below.
    const nextCount = Math.max((dashboardGoals?.count || 0) - deletedGoalIds.length, 0);
    const nextRowCount = (dashboardGoals?.goalRows?.length || 0) - deletedGoalIds.length;
    if (nextCount > sortConfig.offset + nextRowCount) {
      setRefreshKey((k) => k + 1);
    }
  };

  const fetchAllGoalIds = React.useCallback(async () => {
    const params = new URLSearchParams(goalsQuery);
    params.set('includeAllGoalIds', 'true');
    params.set('skipCache', 'true');

    const nextDashboardGoals = await fetchGoalDashboardGoals(params.toString());
    const nextAllGoalIds = nextDashboardGoals?.allGoalIds || [];
    setDashboardGoals((previousDashboardGoals) => ({
      ...previousDashboardGoals,
      allGoalIds: nextAllGoalIds,
    }));
    return nextAllGoalIds;
  }, [goalsQuery, setDashboardGoals]);

  React.useEffect(() => {
    if (!dashboardGoals || sortConfig.activePage <= maxPage) {
      return;
    }

    setSortConfig((previousConfig) => ({
      ...previousConfig,
      activePage: maxPage,
      offset: (maxPage - 1) * perPage,
    }));
  }, [dashboardGoals?.count, maxPage, perPage, sortConfig.activePage]);

  return (
    <WidgetContainer
      className="ttahub-goal-dashboard-goals maxw-full"
      loading={dashboardGoalsLoading}
      loadingLabel="Goal dashboard goals loading"
      title="TTA goals and objectives"
      subtitle={
        <p className="font-body-md line-height-body-4 margin-0">
          Data reflects activity starting on {dataStartDateDisplay}.
        </p>
      }
      showHeaderBorder={false}
      titleGroupClassNames="padding-x-3 padding-top-3 position-relative"
    >
      <div className="ttahub-goal-dashboard-goals__section padding-x-3 padding-top-2 padding-bottom-3 minh-card">
        <div className="ttahub-goal-dashboard-goals__controls display-flex flex-justify flex-align-center flex-gap-2 minh-5">
          <div className="ttahub-goal-dashboard-goals__sort-control display-flex flex-align-center">
            <Label
              htmlFor="goal-dashboard-goals-sort"
              className="margin-y-0 margin-right-1 text-no-wrap"
            >
              Sort by
            </Label>
            <Dropdown
              id="goal-dashboard-goals-sort"
              name="goal-dashboard-goals-sort"
              className="ttahub-goal-dashboard-goals__sort-select margin-top-0"
              value={`${sortConfig.sortBy}-${sortConfig.direction}`}
              onChange={handleSortChange}
            >
              {GOAL_DASHBOARD_SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Dropdown>
          </div>
          <div className="ttahub-goal-dashboard-goals__per-page-control display-flex flex-align-center">
            <Label
              htmlFor="goal-dashboard-goals-per-page"
              className="margin-y-0 margin-right-1 text-no-wrap"
            >
              Show
            </Label>
            <Dropdown
              id="goal-dashboard-goals-per-page"
              name="goal-dashboard-goals-per-page"
              className="ttahub-goal-dashboard-goals__per-page-select margin-top-0"
              value={perPage}
              onChange={handlePerPageChange}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </Dropdown>
          </div>
        </div>
        {dashboardGoalsError && (
          <Alert type="error" role="alert" className="margin-top-3">
            {dashboardGoalsError}
          </Alert>
        )}
        {hasDashboardGoals && (
          <GoalDashboardGoalCards
            goals={goalRows}
            goalsCount={goalsCount}
            allGoalIds={allGoalIds}
            onGoalDeleted={handleGoalDeleted}
            onSelectAllGoals={fetchAllGoalIds}
          />
        )}
        {hasDashboardGoals && goalsCount > 0 && (
          <div className="border-top smart-hub-border-base-lighter margin-x-neg-3 margin-top-3 padding-3 minh-9">
            <PaginationCard
              totalCount={goalsCount}
              currentPage={sortConfig.activePage}
              offset={sortConfig.offset}
              perPage={perPage}
              handlePageChange={handlePageChange}
              accessibleLandmarkName="TTA goals and objectives pagination"
              paginationClassName="padding-x-1 margin-0"
            />
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

GoalDashboardGoalsSection.propTypes = {
  dataStartDateDisplay: PropTypes.string.isRequired,
};

export default GoalDashboardGoalsSection;
