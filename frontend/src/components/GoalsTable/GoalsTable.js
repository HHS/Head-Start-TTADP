/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Grid, Alert,
} from '@trussworks/react-uswds';
import { filtersToQueryString } from '../../utils';
import GoalsTableHeader from './GoalsTableHeader';
import Container from '../Container';
import GoalRow from './GoalRow';
import { GOALS_PER_PAGE } from '../../Constants';
import './GoalTable.scss';
import { getRecipientGoals } from '../../fetchers/recipient';
import CloseSuspendReasonModal from '../CloseSuspendReasonModal';
import { updateGoalStatus } from '../../fetchers/goals';
import useSessionSort from '../../hooks/useSessionSort';

function GoalsTable({
  recipientId,
  regionId,
  filters,
  hasActiveGrants,
  showNewGoals,
}) {
  // Goal Data.
  const [goals, setGoals] = useState([]);

  // Close/Suspend Reason Modal.
  const [closeSuspendGoalId, setCloseSuspendGoalId] = useState(0);
  const [closeSuspendStatus, setCloseSuspendStatus] = useState('');
  const [closeSuspendOldStatus, setCloseSuspendOldStatus] = useState(null);
  const [resetModalValues, setResetModalValues] = useState(false);
  const closeSuspendModalRef = useRef();

  const showCloseSuspendGoalModal = (status, goalId, oldGoalStatus) => {
    setCloseSuspendGoalId(goalId);
    setCloseSuspendStatus(status);
    setCloseSuspendOldStatus(oldGoalStatus);
    setResetModalValues(!resetModalValues); // Always flip to trigger form reset useEffect.
    closeSuspendModalRef.current.toggleModal(true);
  };

  const performGoalStatusUpdate = async (
    goalId,
    newGoalStatus,
    oldGoalStatus,
    closeSuspendReason = null,
    closeSuspendContext = null,
  ) => {
    const updatedGoal = await updateGoalStatus(
      goalId,
      newGoalStatus,
      oldGoalStatus,
      closeSuspendReason,
      closeSuspendContext,
    );
    if (closeSuspendReason && closeSuspendModalRef.current.modalIsOpen) {
      // Close from a close suspend reason submit.
      closeSuspendModalRef.current.toggleModal(false);
    }

    const newGoals = goals.map(
      (g) => (g.id === updatedGoal.id ? { ...g, goalStatus: updatedGoal.status } : g),
    );
    setGoals(newGoals);
  };

  // Page Behavior.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultSort = showNewGoals
    ? {
      sortBy: 'createdOn',
      direction: 'desc',
    }
    : {
      sortBy: 'goalStatus',
      direction: 'asc',
    };

  // Grid and Paging.
  const [sortConfig, setSortConfig] = useSessionSort({
    ...defaultSort,
    activePage: 1,
    offset: 0,
  }, `goalsTable/${recipientId}/${regionId}`);

  const [goalsCount, setGoalsCount] = useState(0);

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
          sortConfig.offset,
          GOALS_PER_PAGE,
          filterQuery,
        );
        setGoals(goalRows);
        setGoalsCount(count);
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Unable to fetch goals');
      }
      setLoading(false);
    }
    fetchGoals();
  }, [sortConfig, filters, recipientId, regionId, showNewGoals]);

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      setSortConfig({
        ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * GOALS_PER_PAGE,
      });
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
    setSortConfig({
      ...sortConfig, sortBy, direction, activePage: 1, offset: 0,
    });
  };

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderColumnHeader = (displayName, name, allowSort = true, align = 'left') => {
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
      <th scope="col" aria-sort={fullAriaSort} className={`text-${align}`}>
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

  return (
    <>
      {error && (
      <Grid row>
        <Alert type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}
      <Container className="goals-table maxw-full overflow-x-hidden" padding={0} loading={loading} loadingLabel="Goals table loading">
        <CloseSuspendReasonModal
          id="close-suspend-reason-modal"
          goalId={closeSuspendGoalId}
          newStatus={closeSuspendStatus}
          modalRef={closeSuspendModalRef}
          onSubmit={performGoalStatusUpdate}
          resetValues={resetModalValues}
          oldGoalStatus={closeSuspendOldStatus}
        />
        <GoalsTableHeader
          title="TTA goals and objectives"
          count={goalsCount || 0}
          activePage={sortConfig.activePage}
          offset={sortConfig.offset}
          perPage={GOALS_PER_PAGE}
          handlePageChange={handlePageChange}
          recipientId={recipientId}
          regionId={regionId}
          hasActiveGrants={hasActiveGrants}
        />
        <div className="usa-table-container padding-x-3">
          <Table fullWidth scrollable>
            <caption className="usa-sr-only">
              TTA goals and objective count with sorting and pagination
            </caption>
            <thead>
              <tr>
                {renderColumnHeader('Goal status', 'goalStatus')}
                {renderColumnHeader('Created on', 'createdOn')}
                {renderColumnHeader('Goal text (Goal ID)', 'goalText', false)}
                {renderColumnHeader('Goal topics', 'goalTopics', false)}
                {renderColumnHeader('Objectives', 'objectiveCount', false, 'right')}
                <th scope="col" aria-label="context menu" />
              </tr>
            </thead>
            <tbody>
              {displayGoals.map((goal, index) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  openMenuUp={index >= displayGoals.length - 2} // the last two should open "up"
                  recipientId={recipientId}
                  regionId={regionId}
                  showCloseSuspendGoalModal={showCloseSuspendGoalModal}
                  performGoalStatusUpdate={performGoalStatusUpdate}
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
  hasActiveGrants: PropTypes.bool.isRequired,
  showNewGoals: PropTypes.bool.isRequired,
};

export default GoalsTable;
