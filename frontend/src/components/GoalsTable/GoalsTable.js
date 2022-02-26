/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Grid, Alert,
} from '@trussworks/react-uswds';
import { filtersToQueryString } from '../../utils';
import TableHeader from '../TableHeader';
import Container from '../Container';
import GoalRow from './GoalRow';
import { GOALS_PER_PAGE } from '../../Constants';
import './GoalTable.css';
import { getRecipientGoals } from '../../fetchers/recipient';

function GoalsTable({
  recipientId,
  regionId,
  filters,
  onUpdateFilters,
}) {
  // Goal Data.
  const [goals, setGoals] = useState([]);

  // Page Behavior.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Grid and Paging.
  const [activePage, setActivePage] = useState(1);
  const [goalsCount, setGoalsCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [perPage] = useState(GOALS_PER_PAGE);
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'goalStatus',
    direction: 'asc',
  });

  useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {
        const { count, goalRows } = await getRecipientGoals(
          recipientId,
          regionId,
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
          filterQuery,
        );
        setGoals(goalRows);
        setGoalsCount(count);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Unable to fetch goals');
      }
      setLoading(false);
    }
    fetchGoals();
  }, [sortConfig, offset, perPage, filters, recipientId, regionId]);

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      setActivePage(pageNumber);
      setOffset((pageNumber - 1) * perPage);
    }
  };

  const requestSort = (sortBy) => {
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setActivePage(1);
    setOffset(0);
    setSortConfig({ sortBy, direction });
  };

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderColumnHeader = (displayName, name, allowSort = true) => {
    const sortClassName = getClassNamesFor(name);
    let fullAriaSort;
    switch (sortClassName) {
      case 'asc':
        fullAriaSort = 'ascending';
        break;
      case 'desc':
        fullAriaSort = 'descending';
        break;
      default:
        fullAriaSort = 'none';
        break;
    }

    return (
      <th scope="col" aria-sort={fullAriaSort}>
        {
          allowSort
            ? (
              <a
                role="button"
                tabIndex={0}
                onClick={() => {
                  requestSort(name);
                }}
                onKeyPress={() => requestSort(name)}
                className={`sortable ${sortClassName}`}
                aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
                }`}
              >
                {displayName}
              </a>
            )
            : displayName
        }
      </th>
    );
  };

  const displayGoals = goals && goals.length ? goals : [];

  const updateGoal = (newGoal) => {
    // Update Status on Goal.
    const newGoals = goals.map(
      (g) => (g.id === newGoal.id ? { ...g, goalStatus: newGoal.status } : g),
    );
    setGoals(newGoals);
  };

  return (
    <>
      <Grid row>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>

      <Container className="goals-table inline-size maxw-full" padding={0} loading={loading} loadingLabel="Goals table loading">
        <TableHeader
          title="TTA goals and objectives"
          onUpdateFilters={onUpdateFilters}
          count={goalsCount || 0}
          activePage={activePage}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          hideMenu
          paginationName="goals"
        />
        <div className="usa-table-container">
          <Table className="goals-table-content" fullWidth>
            <caption className="usa-sr-only">
              TTA goals and objective count with sorting and pagination
            </caption>
            <thead>
              <tr>
                {renderColumnHeader('Goal status', 'goalStatus')}
                {renderColumnHeader('Created on', 'createdOn')}
                {renderColumnHeader('Goal text (Goal ID)', 'goalText', false)}
                {renderColumnHeader('Goal topic(s)', 'goalTopics', false)}
                {renderColumnHeader('Objectives', 'objectiveCount', false)}
                <th scope="col" aria-label="context menu" />
              </tr>
            </thead>
            <tbody>
              {displayGoals.map((goal, index) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  openMenuUp={index > displayGoals.length - 1}
                  updateGoal={updateGoal}
                />
              ))}
            </tbody>
          </Table>
        </div>
      </Container>

    </>
  );
}
GoalsTable.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.string,
      topic: PropTypes.string,
    }),
  ).isRequired,
  onUpdateFilters: PropTypes.func,
};

GoalsTable.defaultProps = {
  onUpdateFilters: () => { },
};

export default GoalsTable;
