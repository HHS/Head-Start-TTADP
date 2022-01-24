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
import { GOALS_PER_PAGE } from '../../Constants';
import './GoalTable.css';
import { getRecipientGoals } from '../../fetchers/recipient';

/*
const emptyGoals = [{
  id: 4598,
  goalStatus: 'In progress',
  createdOn: '06/15/2021',
  goalText: 'Recipient will identify systems to strengthen and mitigate risk.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 5,
  goalNumber: 'R14-G-4598',
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance', 'Monitoring | Area of Concern'],
},
{
  id: 8547,
  goalStatus: 'Closed',
  createdOn: '01/15/2021',
  goalText: 'Recipient will identify systems.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 2,
  goalNumber: 'R14-G-8547',
  reasons: ['New Staff / Turnover', 'Monitoring | Area of Concern'],
},
{
  id: 65478,
  goalStatus: 'Needs status',
  createdOn: '10/15/2021',
  goalText: 'Professional development opportunity provided by the Office of Head Start Region V TTA Network to strengthen participants leadership skills.',
  goalTopics: ['Compliance', 'New Staff / Turnover', 'Data and Evaluation'],
  objectiveCount: 4,
  goalNumber: 'R14-G-65478',
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance', 'Monitoring | Area of Concern'],
},
{
  id: 5874,
  goalStatus: 'Draft',
  createdOn: '10/15/2021',
  goalText: 'Recipient will identify systems to strengthen and mitigate risk of future DEF in the areas of MH and HR.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 4,
  goalNumber: 'R14-G-5874',
  reasons: ['Complaint', 'Full Enrollment'],
},
{
  id: 88554,
  goalStatus: 'Not started',
  createdOn: '10/15/2021',
  goalText: 'Recipient will identify systems to strengthen and mitigate risk of future DEF in the areas of MH and HR.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 4,
  goalNumber: 'R14-G-88554',
  reasons: ['Complaint', 'Full Enrollment'],
},
{
  id: 58742,
  goalStatus: 'Ceased/suspended',
  createdOn: '10/15/2021',
  goalText: 'Recipient will identify systems to strengthen and mitigate risk of future DEF in the areas of MH and HR.',
  goalTopics: ['Behavioral / Mental Health / Trauma',
    'Child Assessment, Development, Screening',
    'CLASS: Classroom Organization',
    'CLASS: Emotional Support',
    'CLASS: Instructional Support',
    'Coaching',
    'Communication',
    'Community and Self-Assessment',
    'Culture & Language',
    'Curriculum (Instructional or Parenting)',
    'Data and Evaluation',
    'ERSEA',
    'Environmental Health and Safety / EPRR',
    'Equity',
    'Facilities',
    'Family Support Services'],
  objectiveCount: 4,
  goalNumber: 'R14-G-58742',
  reasons: ['Complaint', 'Full Enrollment'],
},
];
*/
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
  const [perPage] = useState(GOALS_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState({
    sortBy: 'updatedAt',
    direction: 'desc',
  });

  useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {
        console.log('Offset Value:', offset);
        const { count, goalRows } = await getRecipientGoals(
          '359',
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
          filterQuery,
        );
        setGoals(goalRows);
        setGoalsCount(count || 0);
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

  const displayGoals = goals.length ? goals : [];

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
        <div className="usa-table-container">
          <Table className="goals-table-content" fullWidth>
            <caption className="usa-sr-only">
              TTA goals and objectiveCount with sorting and pagination
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
