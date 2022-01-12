/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Grid, Alert,
} from '@trussworks/react-uswds';
import { filtersToQueryString } from '../Filter';
import TableHeader from '../TableHeader';
import Container from '../Container';
import GoalRow from './GoalRow';
import { REPORTS_PER_PAGE } from '../../Constants';
import './GoalTable.css';

const emptyGoal = {
  id: 0,
  goalStatus: 'In progress',
  createdOn: '06/15/2021',
  goalText: 'Recipient will identify systems to strengthen and mitigate risk of future DEF in the areas of MH and HR. (R14-G-4598)',
  goalTopics: 'Human Resources, Safety Practices, Program Planning and Services',
  objectives: 2,
};

function GoalsTable({
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
  const [perPage] = useState(REPORTS_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState({
    sortBy: 'updatedAt',
    direction: 'desc',
  });

  useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {

        /*
                const { count, rows } = await getReports(
                  sortConfig.sortBy,
                  sortConfig.direction,
                  offset,
                  perPage,
                  filterQuery,
                );
                setGoals(rows);
                setGoalsCount(count || 0);
                */
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      }
      setLoading(false);
    }
    fetchGoals();
  }, [sortConfig, offset, perPage, filters]);

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
  const renderColumnHeader = (displayName, name) => {
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
      </th>
    );
  };

  const displayGoals = goals.length ? goals : [emptyGoal];

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
          count={goalsCount}
          activePage={activePage}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          hideMenu
        />
        <div className="usa-table-container--scrollable">
          <Table fullWidth striped>
            <caption className="usa-sr-only">
              TTA goals and objectives with sorting and pagination
            </caption>
            <thead>
              <tr>
                {renderColumnHeader('Goal status', 'goalStatus')}
                {renderColumnHeader('Created on', 'createdOn')}
                {renderColumnHeader('Goal text (Goal ID)', 'goalText')}
                {renderColumnHeader('Goal topic(s)', 'goalTopics')}
                {renderColumnHeader('Objectives', 'objectives')}
                <th scope="col" aria-label="context menu" />
              </tr>
            </thead>
            <tbody>
              {displayGoals.map((goal, index) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  openMenuUp={index > displayGoals.length - 1}
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
