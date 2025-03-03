/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState, useRef, useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import GoalsCardsHeader from './GoalsCardsHeader';
import Container from '../Container';
import GoalCard from './GoalCard';
import CloseSuspendReasonModal from '../CloseSuspendReasonModal';
import { updateGoalStatus, reopenGoal } from '../../fetchers/goals';
import ReopenReasonModal from '../ReopenReasonModal';
import { parseCheckboxEvent } from '../../Constants';

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
  canMergeGoals,
  shouldDisplayMergeSuccess,
  dismissMergeSuccess,
  goalBuckets,
}) {
  // Goal select check boxes.
  const [selectedGoalCheckBoxes, setSelectedGoalCheckBoxes] = useState({});
  const [allGoalsChecked, setAllGoalsChecked] = useState(false);

  // Close/Suspend Reason Modal.
  const [closeSuspendGoalIds, setCloseSuspendGoalIds] = useState([]);
  const [closeSuspendStatus, setCloseSuspendStatus] = useState('');
  const [closeSuspendOldStatus, setCloseSuspendOldStatus] = useState(null);
  const [resetModalValues, setResetModalValues] = useState(false);
  const closeSuspendModalRef = useRef();

  // Reopen reason modal.
  const [reopenGoalId, setReopenGoalId] = useState(null);
  const [resetReopenModalValues, setResetReopenModalValues] = useState(false);
  const reopenModalRef = useRef();

  const showCloseSuspendGoalModal = (status, goalIds, oldGoalStatus) => {
    setCloseSuspendGoalIds(goalIds);
    setCloseSuspendStatus(status);
    setCloseSuspendOldStatus(oldGoalStatus);
    setResetModalValues(!resetModalValues); // Always flip to trigger form reset useEffect.
    closeSuspendModalRef.current.toggleModal(true);
  };

  const showReopenGoalModal = (goalId) => {
    setReopenGoalId(goalId);
    setResetReopenModalValues(!resetReopenModalValues);
    reopenModalRef.current.toggleModal(true);
  };

  const onSubmitReopenGoal = async (goalId, reopenReason, reopenContext) => {
    const updatedGoal = await reopenGoal(goalId, reopenReason, reopenContext);

    const newGoals = goals.map((g) => (g.id === updatedGoal.id ? {
      ...g,
      goalStatus: 'In Progress',
      previousStatus: 'Closed',
      isReopenedGoal: true,
    } : g));

    setGoals(newGoals);

    reopenModalRef.current.toggleModal(false);
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

  const selectAllGoalCheckboxSelect = (event) => {
    const { checked } = parseCheckboxEvent(event);

    // Preserve checked goals on other pages.
    const thisPagesGoalIds = goals.map((g) => g.id);
    const preservedCheckboxes = Object.keys(selectedGoalCheckBoxes).reduce((obj, key) => {
      if (!thisPagesGoalIds.includes(parseInt(key, DECIMAL_BASE))) {
        return { ...obj, [key]: selectedGoalCheckBoxes[key] };
      }
      return { ...obj };
    }, {});

    if (checked === true) {
      setSelectedGoalCheckBoxes({ ...makeGoalCheckboxes(goals, true), ...preservedCheckboxes });
    } else {
      setSelectedGoalCheckBoxes({ ...makeGoalCheckboxes(goals, false), ...preservedCheckboxes });
    }
  };

  // Check if all goals on the page are checked.
  useEffect(() => {
    const goalIds = goals.map((g) => g.id);
    const countOfCheckedOnThisPage = goalIds.filter((id) => selectedGoalCheckBoxes[id]).length;
    if (goals.length === countOfCheckedOnThisPage) {
      setAllGoalsChecked(true);
    } else {
      setAllGoalsChecked(false);
    }
  }, [goals, selectedGoalCheckBoxes]);

  const handleGoalCheckboxSelect = (event) => {
    const { checked, value } = parseCheckboxEvent(event);
    if (checked === true) {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: true });
    } else {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: false });
    }
  };

  const checkAllGoals = (isClear) => {
    const allIdCheckBoxes = allGoalIds.reduce((obj, g) => ({ ...obj, [g]: !isClear }), {});
    setSelectedGoalCheckBoxes(allIdCheckBoxes);
  };

  const numberOfSelectedGoals = Object.values(selectedGoalCheckBoxes).filter((g) => g).length;

  const selectedCheckBoxes = Object.keys(selectedGoalCheckBoxes).filter(
    (g) => selectedGoalCheckBoxes[g],
  );

  const selectedGoalIdsButNumerical = selectedCheckBoxes.map((id) => parseInt(id, DECIMAL_BASE));
  const draftSelectedRttapa = goals.filter((g) => selectedGoalIdsButNumerical.includes(g.id) && g.goalStatus === 'Draft').map((g) => g.id);

  const allSelectedPageGoalIds = (() => {
    const selection = goals.filter((g) => selectedGoalCheckBoxes[g.id]);
    return selection.map((g) => g.id);
  })();

  return (
    <>
      {error && (
      <Grid row>
        <Alert type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}
      <Container className="goals-table maxw-full position-relative padding-bottom-2" paddingX={0} paddingY={0} positionRelative loading={loading} loadingLabel="Goals table loading">
        <CloseSuspendReasonModal
          id="close-suspend-reason-modal"
          goalIds={closeSuspendGoalIds}
          newStatus={closeSuspendStatus}
          modalRef={closeSuspendModalRef}
          onSubmit={performGoalStatusUpdate}
          resetValues={resetModalValues}
          oldGoalStatus={closeSuspendOldStatus}
        />
        <ReopenReasonModal
          id="reopen-reason-modal"
          modalRef={reopenModalRef}
          goalId={reopenGoalId}
          resetValues={resetReopenModalValues}
          onSubmit={onSubmitReopenGoal}
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
          pageSelectedGoalIds={allSelectedPageGoalIds}
          perPageChange={perPageChange}
          pageGoalIds={goals.map((g) => g.id)}
          draftSelectedRttapa={draftSelectedRttapa}
          canMergeGoals={canMergeGoals}
          shouldDisplayMergeSuccess={shouldDisplayMergeSuccess}
          dismissMergeSuccess={dismissMergeSuccess}
          goalBuckets={goalBuckets}
          allSelectedGoalIds={selectedGoalCheckBoxes}
        />
        <div className="padding-x-3 padding-y-2 ttahub-goal-cards">
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
              showReopenGoalModal={showReopenGoalModal}
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
  error: PropTypes.string,
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
  canMergeGoals: PropTypes.bool.isRequired,
  shouldDisplayMergeSuccess: PropTypes.bool,
  dismissMergeSuccess: PropTypes.func.isRequired,
  goalBuckets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    goalIds: PropTypes.arrayOf(PropTypes.number),
  })).isRequired,
};

GoalCards.defaultProps = {
  allGoalIds: [],
  shouldDisplayMergeSuccess: false,
  perPage: 10,
  error: '',
};
export default GoalCards;
