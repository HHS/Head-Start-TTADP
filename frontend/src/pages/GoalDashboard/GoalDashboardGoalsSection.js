import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import { Dropdown, Label } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import PaginationCard from '../../components/PaginationCard';
import './GoalDashboardGoalsSection.css';

const DEFAULT_PER_PAGE = 10;

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

function GoalDashboardGoalsSection({ dataStartDateDisplay, totalGoals }) {
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT_CONFIG);

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
    setPerPage(nextPerPage > 0 ? nextPerPage : DEFAULT_PER_PAGE);
    setSortConfig((previousConfig) => ({
      ...previousConfig,
      activePage: 1,
      offset: 0,
    }));
  };

  return (
    <Container className="ttahub-goal-dashboard-goals maxw-full" paddingX={0} paddingY={0}>
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
              <option value={totalGoals}>All</option>
            </Dropdown>
          </div>
        </div>
        {totalGoals > 0 && (
          <div className="border-top smart-hub-border-base-lighter margin-x-neg-3 margin-top-3 padding-3 minh-9">
            <PaginationCard
              totalCount={totalGoals}
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
  totalGoals: PropTypes.number,
};

GoalDashboardGoalsSection.defaultProps = {
  totalGoals: 0,
};

export default GoalDashboardGoalsSection;
