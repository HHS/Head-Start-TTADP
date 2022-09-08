/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import GoalsCardsHeader from './GoalsCardsHeader';
import Container from '../Container';
import GoalCard from './GoalCard';
import { GOALS_PER_PAGE } from '../../Constants';

import CloseSuspendReasonModal from '../CloseSuspendReasonModal';
import { updateGoalStatus } from '../../fetchers/goals';

function GoalCards({
  recipientId,
  regionId,
  hasActiveGrants,
  goals,
  error,
  goalsCount,
  handlePageChange,
  requestSort,
  loading,
  sortConfig,
  setGoals,
}) {
  // Close/Suspend Reason Modal.
  const [closeSuspendGoalIds, setCloseSuspendGoalIds] = useState([]);
  const [closeSuspendStatus, setCloseSuspendStatus] = useState('');
  const [closeSuspendOldStatus, setCloseSuspendOldStatus] = useState(null);
  const [resetModalValues, setResetModalValues] = useState(false);
  const closeSuspendModalRef = useRef();

  const showCloseSuspendGoalModal = (status, goalIds, oldGoalStatus) => {
    setCloseSuspendGoalIds(goalIds);
    setCloseSuspendStatus(status);
    setCloseSuspendOldStatus(oldGoalStatus);
    setResetModalValues(!resetModalValues); // Always flip to trigger form reset useEffect.
    closeSuspendModalRef.current.toggleModal(true);
  };

  const performGoalStatusUpdate = async (
    goalIds,
    newGoalStatus,
    oldGoalStatus,
    closeSuspendReason = null,
    closeSuspendContext = null,
  ) => {
    const updatedGoal = await updateGoalStatus(
      goalIds,
      newGoalStatus,
      oldGoalStatus,
      closeSuspendReason,
      closeSuspendContext,
    );
    if (closeSuspendReason && closeSuspendModalRef.current.modalIsOpen) {
      // Close from a close suspend reason submit.
      closeSuspendModalRef.current.toggleModal(false);
    }

    const updatedGoalIds = updatedGoal.map(({ id }) => id);

    const newGoals = goals.map(
      (g) => (updatedGoalIds.includes(g.id) ? { ...g, goalStatus: newGoalStatus } : g),
    );
    setGoals(newGoals);
  };

  return (
    <>
      {error && (
      <Grid row>
        <Alert type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}
      <Container className="goals-table maxw-full overflow-x-hidden" paddingX={0} paddingY={0} loading={loading} loadingLabel="Goals table loading">
        <CloseSuspendReasonModal
          id="close-suspend-reason-modal"
          goalIds={closeSuspendGoalIds}
          newStatus={closeSuspendStatus}
          modalRef={closeSuspendModalRef}
          onSubmit={performGoalStatusUpdate}
          resetValues={resetModalValues}
          oldGoalStatus={closeSuspendOldStatus}
        />
        <GoalsCardsHeader
          title="TTA goals and objectives"
          count={goalsCount || 0}
          activePage={sortConfig.activePage}
          offset={sortConfig.offset}
          perPage={GOALS_PER_PAGE}
          handlePageChange={handlePageChange}
          recipientId={recipientId}
          regionId={regionId}
          hasActiveGrants={hasActiveGrants}
          sortConfig={sortConfig}
          requestSort={requestSort}
        />
        <div>

          {goals.map((goal, index) => (
            <GoalCard
              key={`goal-row-${goal.id}`}
              goal={goal}
              openMenuUp={
                    index >= goals.length - 2 && index !== 0
                  } // the last two should open "up"
              recipientId={recipientId}
              regionId={regionId}
              showCloseSuspendGoalModal={showCloseSuspendGoalModal}
              performGoalStatusUpdate={performGoalStatusUpdate}
            />
          ))}

        </div>
      </Container>
    </>
  );
}
GoalCards.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  goals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
  })).isRequired,
  error: PropTypes.string.isRequired,
  goalsCount: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }).isRequired,
  setGoals: PropTypes.func.isRequired,
};

export default GoalCards;
