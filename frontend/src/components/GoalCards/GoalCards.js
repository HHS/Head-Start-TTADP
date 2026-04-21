/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Alert } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import GoalsCardsHeader from './GoalsCardsHeader';
import Container from '../Container';
import StandardGoalCard from './StandardGoalCard';
import useCheckboxSelection from '../../hooks/useCheckboxSelection';

function GoalCards({
  recipientId,
  regionId,
  hasActiveGrants,
  hasMissingStandardGoals,
  goals,
  error,
  goalsCount,
  handlePageChange,
  requestSort,
  loading,
  sortConfig,
  allGoalIds,
  perPage,
  perPageChange,
}) {
  // Goal select check boxes.
  const {
    selectedCheckboxes: selectedGoalCheckBoxes,
    allPageChecked: allGoalsChecked,
    numberOfSelected: numberOfSelectedGoals,
    pageSelectedIds: allSelectedPageGoalIds,
    handleCheckboxSelect: handleGoalCheckboxSelect,
    handleSelectAllPage: selectAllGoalCheckboxSelect,
    selectOrClearAll: checkAllGoals,
    isChecked,
  } = useCheckboxSelection({
    items: goals,
    allItemIds: allGoalIds,
    getItemId: (goal) => String(goal.id),
  });

  // draftSelectedRttapa needs numeric IDs and goalStatus — keep this as is
  const selectedGoalIdsButNumerical = Object.keys(selectedGoalCheckBoxes)
    .filter((g) => selectedGoalCheckBoxes[g])
    .map((id) => parseInt(id, DECIMAL_BASE));
  const draftSelectedRttapa = goals
    .filter((g) => selectedGoalIdsButNumerical.includes(g.id) && g.goalStatus === 'Draft')
    .map((g) => g.id);

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
          hasMissingStandardGoals={hasMissingStandardGoals}
          sortConfig={sortConfig}
          requestSort={requestSort}
          numberOfSelectedGoals={numberOfSelectedGoals}
          allGoalsChecked={allGoalsChecked}
          selectAllGoalCheckboxSelect={selectAllGoalCheckboxSelect}
          selectAllGoals={checkAllGoals}
          pageSelectedGoalIds={allSelectedPageGoalIds.map((id) => parseInt(id, DECIMAL_BASE))}
          perPageChange={perPageChange}
          pageGoalIds={goals.map((g) => g.id)}
          draftSelectedRttapa={draftSelectedRttapa}
          allSelectedGoalIds={selectedGoalCheckBoxes}
        />
        <div className="padding-x-3 padding-y-2 ttahub-goal-cards">
          {goals.map((goal, index) => (
            <StandardGoalCard
              key={`goal-row-${goal.id}`}
              goal={goal}
              openMenuUp={
                    index >= goals.length - 2 && index !== 0
                  } // the last two should open "up"
              recipientId={recipientId}
              regionId={regionId}
              handleGoalCheckboxSelect={handleGoalCheckboxSelect}
              isChecked={isChecked(goal.id)}
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
  hasMissingStandardGoals: PropTypes.bool.isRequired,
  goals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
  })).isRequired,
  error: PropTypes.string,
  goalsCount: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }).isRequired,
  allGoalIds: PropTypes.arrayOf(PropTypes.number),
  perPage: PropTypes.number,
  perPageChange: PropTypes.func.isRequired,
};

GoalCards.defaultProps = {
  allGoalIds: [],
  perPage: 10,
  error: '',
  loading: false,
};
export default GoalCards;
