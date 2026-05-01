import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { GOAL_STATUS } from '@ttahub/common';
import { Alert, Button, Checkbox } from '@trussworks/react-uswds';
import useCheckboxSelection from '../../hooks/useCheckboxSelection';
import StandardGoalCard from '../../components/GoalCards/StandardGoalCard';

function GoalDashboardGoalCards({
  goals,
  goalsCount,
  allGoalIds,
  onGoalDeleted,
  onSelectAllGoals,
}) {
  const [selectAllError, setSelectAllError] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const {
    selectedCheckboxes: selectedGoalCheckboxes,
    allPageChecked,
    numberOfSelected,
    pageSelectedIds,
    handleCheckboxSelect,
    handleSelectAllPage,
    selectOrClearAll,
    selectIds,
    isChecked,
  } = useCheckboxSelection({
    items: goals,
    allItemIds: allGoalIds,
    getItemId: (goal) => String(goal.id),
    pruneOnAllItemIdsChange: true,
  });

  const showSelectionAlert = allPageChecked && goalsCount > 0;
  const allResultsSelected = numberOfSelected === goalsCount;
  const hasSelectedGoals = numberOfSelected > 0;

  const clearSelectedGoals = () => {
    selectOrClearAll(true);
  };

  const handleSelectAllResults = async () => {
    if (allResultsSelected) {
      selectOrClearAll(true);
      return;
    }

    try {
      setSelectAllError(false);
      setSelectAllLoading(true);
      const goalIds = allGoalIds.length === goalsCount
        ? allGoalIds
        : await onSelectAllGoals();
      selectIds(goalIds);
    } catch (e) {
      setSelectAllError(true);
    } finally {
      setSelectAllLoading(false);
    }
  };

  return (
    <>
      <div className="border-top smart-hub-border-base-lighter margin-x-neg-3 margin-top-3 padding-x-3 padding-y-2">
        <div className="margin-left-3 display-flex flex-row flex-align-center">
          <Checkbox
            label="Select all"
            id="goal-dashboard-select-all-goals"
            checked={allPageChecked}
            onChange={handleSelectAllPage}
            disabled={!goals.length}
          />
          {hasSelectedGoals && (
            <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 radius-pill padding-right-1 padding-left-2 padding-y-05">
              {numberOfSelected}
              {' '}
              selected
              <Button
                type="button"
                unstyled
                className="margin-left-1"
                aria-label="deselect all goals"
                onClick={clearSelectedGoals}
              >
                Clear
              </Button>
            </span>
          )}
        </div>
        {showSelectionAlert && (
          <Alert className="margin-top-2" type="info" slim>
            {allResultsSelected
              ? `All ${goalsCount} goals are selected.`
              : `All ${pageSelectedIds.length} goals on this page are selected.`}
            <Button
              type="button"
              unstyled
              className="margin-left-1"
              onClick={handleSelectAllResults}
              disabled={selectAllLoading}
            >
              {allResultsSelected
                ? 'Clear selection'
                : `Select all ${goalsCount} goals`}
            </Button>
          </Alert>
        )}
        {selectAllError && (
          <Alert className="margin-top-2" type="error" slim>
            Unable to select all goals. Please try again.
          </Alert>
        )}
      </div>
      <div className="padding-y-2 ttahub-goal-cards">
        {goals.map((goal) => {
          const goalRegionId = goal.grant?.regionId ? String(goal.grant.regionId) : '';
          const goalRecipientId = goal.grant?.recipientId ? String(goal.grant.recipientId) : '';
          return (
            <StandardGoalCard
              key={`goal-dashboard-goal-${goal.id}`}
              goal={goal}
              recipientId={goalRecipientId}
              regionId={goalRegionId}
              recipientName={goal.grant?.recipient?.name || ''}
              showRecipientColumn
              deletableStatuses={[GOAL_STATUS.NOT_STARTED]}
              onGoalDeleted={onGoalDeleted}
              handleGoalCheckboxSelect={handleCheckboxSelect}
              isChecked={isChecked(goal.id)}
              allSelectedGoalIds={selectedGoalCheckboxes}
            />
          );
        })}
      </div>
    </>
  );
}

GoalDashboardGoalCards.propTypes = {
  goals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    grant: PropTypes.shape({
      recipientId: PropTypes.number,
      regionId: PropTypes.number,
      recipient: PropTypes.shape({
        name: PropTypes.string,
      }),
    }),
  })).isRequired,
  goalsCount: PropTypes.number,
  allGoalIds: PropTypes.arrayOf(PropTypes.number),
  onGoalDeleted: PropTypes.func,
  onSelectAllGoals: PropTypes.func,
};

GoalDashboardGoalCards.defaultProps = {
  goalsCount: 0,
  allGoalIds: [],
  onGoalDeleted: null,
  onSelectAllGoals: async () => [],
};

export default GoalDashboardGoalCards;
