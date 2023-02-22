/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import GoalsCardsHeader from './GoalsCardsHeader';
import Container from '../Container';
import GoalCard from './GoalCard';
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
  allGoalIds,
  perPage,
  perPageChange,
}) {
  // Goal select check boxes.
  const [selectedGoalCheckBoxes, setSelectedGoalCheckBoxes] = useState({});
  const [allGoalsChecked, setAllGoalsChecked] = useState(false);
  const [printAllGoals, setPrintAllGoals] = useState(false);

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
      (g) => (updatedGoalIds.includes(g.id) ? {
        ...g,
        goalStatus: newGoalStatus,
        previousStatus: oldGoalStatus || 'Not Started',
      } : g),
    );
    setGoals(newGoals);
  };

  const makeGoalCheckboxes = (goalsArr, checked) => (
    goalsArr.reduce((obj, g) => ({ ...obj, [g.id]: checked }), {})
  );

  useEffect(() => {
    const checkValues = Object.values(selectedGoalCheckBoxes);
    if (checkValues.length
      && (checkValues.length === goals.length || checkValues.length === goalsCount)
      && checkValues.every((v) => v === true)) {
      setAllGoalsChecked(true);
    } else if (printAllGoals === true) {
      setPrintAllGoals(false);
    }
  }, [selectedGoalCheckBoxes, allGoalsChecked, printAllGoals, goalsCount, goals.length]);

  const selectAllGoalCheckboxSelect = (event) => {
    const { target: { checked = null } = {} } = event;

    if (checked === true) {
      setSelectedGoalCheckBoxes(makeGoalCheckboxes(goals, true));
      setAllGoalsChecked(true);
    } else {
      setSelectedGoalCheckBoxes(makeGoalCheckboxes(goals, false));
      setAllGoalsChecked(false);
      setPrintAllGoals(false);
    }
  };

  const handleGoalCheckboxSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event;
    if (checked === true) {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: true });
    } else {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: false });
    }
  };

  const checkAllGoals = () => {
    const allIdCheckBoxes = allGoalIds.reduce((obj, g) => ({ ...obj, [g]: true }), {});
    setSelectedGoalCheckBoxes(allIdCheckBoxes);
    setPrintAllGoals(true);
  };

  const numberOfSelectedGoals = Object.values(selectedGoalCheckBoxes).filter((g) => g).length;

  const selectedCheckBoxes = Object.keys(selectedGoalCheckBoxes).filter(
    (g) => selectedGoalCheckBoxes[g],
  );

  return (
    <>
      {error && (
      <Grid row>
        <Alert type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}
      <Container className="goals-table maxw-full position-relative" paddingX={0} paddingY={0} positionRelative loading={loading} loadingLabel="Goals table loading">
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
          perPage={perPage}
          handlePageChange={handlePageChange}
          recipientId={recipientId}
          regionId={regionId}
          hasActiveGrants={hasActiveGrants}
          sortConfig={sortConfig}
          requestSort={requestSort}
          numberOfSelectedGoals={numberOfSelectedGoals}
          allGoalsChecked={allGoalsChecked}
          selectAllGoalCheckboxSelect={selectAllGoalCheckboxSelect}
          selectAllGoals={checkAllGoals}
          selectedGoalIds={selectedCheckBoxes}
          perPageChange={perPageChange}
          pageGoalIds={goals.map((g) => g.id)}
        />
        <div className="padding-x-3 padding-y-2">
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
              handleGoalCheckboxSelect={handleGoalCheckboxSelect}
              isChecked={selectedGoalCheckBoxes[goal.id] || false}
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
  allGoalIds: PropTypes.arrayOf(PropTypes.number),
  perPage: PropTypes.number,
  perPageChange: PropTypes.func.isRequired,
};

GoalCards.defaultProps = {
  allGoalIds: [],
  perPage: 10,
};
export default GoalCards;
