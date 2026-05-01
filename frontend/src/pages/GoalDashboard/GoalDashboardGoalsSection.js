import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import { Alert, Dropdown, Label } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import PaginationCard from '../../components/PaginationCard';
import useFetch from '../../hooks/useFetch';
import { fetchGoalDashboardGoals } from '../../fetchers/goals';
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
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT_CONFIG);
  const goalsQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('sortBy', sortConfig.sortBy);
    params.set('direction', sortConfig.direction);
    params.set('offset', sortConfig.offset);
    params.set('perPage', perPage);
    params.set('skipCache', 'true');
    return params.toString();
  }, [
    perPage,
    sortConfig.direction,
    sortConfig.offset,
    sortConfig.sortBy,
  ]);

  const {
    data: dashboardGoals,
    setData: setDashboardGoals,
    error: dashboardGoalsError,
    loading: dashboardGoalsLoading,
  } = useFetch(
    null,
    () => fetchGoalDashboardGoals(goalsQuery),
    [goalsQuery],
    'Unable to fetch goal dashboard goals',
  );

  const hasDashboardGoals = Boolean(dashboardGoals) && !dashboardGoalsError;
  const goalsCount = hasDashboardGoals ? dashboardGoals.count : 0;
  const goalRows = hasDashboardGoals ? dashboardGoals.goalRows || [] : [];
  const allGoalIds = hasDashboardGoals ? dashboardGoals.allGoalIds || [] : [];

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
    const boundedPerPage = nextPerPage > 0
      ? Math.min(nextPerPage, MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;
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
  };

  const fetchAllGoalIds = useCallback(async () => {
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

  return (
    <Container
      className="ttahub-goal-dashboard-goals maxw-full"
      paddingX={0}
      paddingY={0}
      loading={dashboardGoalsLoading}
      loadingLabel="Goal dashboard goals loading"
      positionRelative
    >
      <section aria-labelledby="goal-dashboard-goals-heading" className="ttahub-goal-dashboard-goals__section padding-x-3 padding-y-3 minh-card">
        <div className="display-flex flex-justify flex-align-start margin-bottom-2 minh-7">
          <div>
            <h2 id="goal-dashboard-goals-heading" className="font-sans-lg text-bold line-height-sans-4 margin-0">
              TTA goals and objectives
            </h2>
            <p className="font-body-md line-height-body-4 margin-0">
              Data reflects activity starting on
              {' '}
              {dataStartDateDisplay}
              .
            </p>
          </div>
        </div>
        <div className="ttahub-goal-dashboard-goals__controls display-flex flex-justify flex-align-center flex-gap-2 minh-5">
          <div className="ttahub-goal-dashboard-goals__sort-control display-flex flex-align-center">
            <Label htmlFor="goal-dashboard-goals-sort" className="margin-y-0 margin-right-1 text-no-wrap">
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
                <option key={value} value={value}>{label}</option>
              ))}
            </Dropdown>
          </div>
          <div className="ttahub-goal-dashboard-goals__per-page-control display-flex flex-align-center">
            <Label htmlFor="goal-dashboard-goals-per-page" className="margin-y-0 margin-right-1 text-no-wrap">
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
      </section>
    </Container>
  );
}

GoalDashboardGoalsSection.propTypes = {
  dataStartDateDisplay: PropTypes.string.isRequired,
};

export default GoalDashboardGoalsSection;
