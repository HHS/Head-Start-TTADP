import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Button, Checkbox } from '@trussworks/react-uswds';
import { GOAL_STATUS } from '@ttahub/common';
import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import colors from '../../colors';
import StandardGoalCard from '../../components/GoalCards/StandardGoalCard';
import useCheckboxSelection from '../../hooks/useCheckboxSelection';

const normalizeGoalIds = (ids) =>
  [...new Set([ids].flat())]
    .map((id) => parseInt(String(id), 10))
    .filter((id) => Number.isInteger(id) && id > 0);

function GoalDashboardGoalCards({
  goals,
  goalsCount,
  allGoalIds,
  onGoalDeleted,
  onSelectAllGoals,
  backLinkState,
  initialSelectedGoalIds,
  onSelectionChange,
  onSelectionReadyChange,
}) {
  const history = useHistory();
  const [selectAllError, setSelectAllError] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const [initialSelectionReady, setInitialSelectionReady] = useState(
    initialSelectedGoalIds.length === 0
  );
  const {
    allPageChecked,
    numberOfSelected,
    pageSelectedIds,
    selectedIds,
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
  const restoredInitialSelection = useRef(false);
  const restoringInitialSelection = useRef(false);
  const userHasInteracted = useRef(false);

  const markUserInteracted = () => {
    userHasInteracted.current = true;
    restoredInitialSelection.current = true;
    setInitialSelectionReady(true);
  };

  useEffect(() => {
    let isSubscribed = true;

    const restoreInitialSelection = async () => {
      if (
        restoredInitialSelection.current ||
        restoringInitialSelection.current ||
        initialSelectionReady ||
        userHasInteracted.current
      ) {
        return;
      }

      restoringInitialSelection.current = true;
      const normalizedInitialSelectedGoalIds = normalizeGoalIds(initialSelectedGoalIds);

      if (!normalizedInitialSelectedGoalIds.length) {
        restoredInitialSelection.current = true;
        setInitialSelectionReady(true);
        restoringInitialSelection.current = false;
        return;
      }

      let nextSelectedGoalIds = normalizedInitialSelectedGoalIds;

      if (allGoalIds.length > 0) {
        const validGoalIds = new Set(normalizeGoalIds(allGoalIds));
        nextSelectedGoalIds = normalizedInitialSelectedGoalIds.filter((id) => validGoalIds.has(id));
      } else if (goalsCount <= goals.length) {
        const visibleGoalIds = new Set(goals.map((goal) => goal.id));
        nextSelectedGoalIds = normalizedInitialSelectedGoalIds.filter((id) =>
          visibleGoalIds.has(id)
        );
      } else {
        try {
          const fetchedAllGoalIds = normalizeGoalIds(await onSelectAllGoals());

          if (!isSubscribed || userHasInteracted.current) {
            restoringInitialSelection.current = false;
            return;
          }

          const validGoalIds = new Set(fetchedAllGoalIds);
          nextSelectedGoalIds = normalizedInitialSelectedGoalIds.filter((id) =>
            validGoalIds.has(id)
          );
        } catch (_e) {
          const visibleGoalIds = new Set(goals.map((goal) => goal.id));
          nextSelectedGoalIds = normalizedInitialSelectedGoalIds.filter((id) =>
            visibleGoalIds.has(id)
          );
        }
      }

      if (isSubscribed) {
        if (userHasInteracted.current) {
          restoringInitialSelection.current = false;
          return;
        }

        selectIds(nextSelectedGoalIds);
        restoredInitialSelection.current = true;
        setInitialSelectionReady(true);
        restoringInitialSelection.current = false;
      }
    };

    restoreInitialSelection();

    return () => {
      isSubscribed = false;
    };
  }, [
    allGoalIds,
    goals,
    goalsCount,
    initialSelectedGoalIds,
    initialSelectionReady,
    onSelectAllGoals,
    selectIds,
  ]);

  const showSelectionAlert = allPageChecked && goalsCount > 0;
  const allResultsSelected = numberOfSelected === goalsCount;
  const restoredSelectedGoalIds = useMemo(
    () => normalizeGoalIds(initialSelectedGoalIds),
    [initialSelectedGoalIds]
  );
  const validatedSelectedGoalIds = useMemo(
    () => selectedIds.map((id) => parseInt(id, 10)),
    [selectedIds]
  );
  const selectedGoalIdsForNavigation = initialSelectionReady
    ? validatedSelectedGoalIds
    : restoredSelectedGoalIds;
  const selectionCount = selectedGoalIdsForNavigation.length;
  const hasSelectedGoals = selectionCount > 0;

  useEffect(() => {
    onSelectionReadyChange(initialSelectionReady);
  }, [initialSelectionReady, onSelectionReadyChange]);

  const clearSelectedGoals = () => {
    markUserInteracted();
    selectOrClearAll(true);
  };

  const handlePreviewAndPrint = () => {
    if (!hasSelectedGoals) {
      return;
    }

    history.push('/dashboards/goal-dashboard/print', {
      previewGoalIds: validatedSelectedGoalIds,
      goalDashboardState: {
        ...backLinkState?.backLinkTo?.state?.goalDashboardState,
        selectedGoalIds: validatedSelectedGoalIds,
      },
    });
  };

  const handleGoalDeletedFromCard = (deletedGoalIds) => {
    markUserInteracted();
    const normalizedDeletedGoalIds = normalizeGoalIds(deletedGoalIds);
    const deletedGoalIdSet = new Set(normalizedDeletedGoalIds.map(String));
    const remainingSelectedGoalIds = selectedIds.filter((id) => !deletedGoalIdSet.has(id));
    selectIds(remainingSelectedGoalIds);

    if (onGoalDeleted) {
      onGoalDeleted(normalizedDeletedGoalIds);
    }
  };

  const handleSelectAllResults = async () => {
    markUserInteracted();

    if (allResultsSelected) {
      selectOrClearAll(true);
      return;
    }

    try {
      setSelectAllError(false);
      setSelectAllLoading(true);
      const goalIds = allGoalIds.length === goalsCount ? allGoalIds : await onSelectAllGoals();
      selectIds(goalIds);
    } catch (_e) {
      setSelectAllError(true);
    } finally {
      setSelectAllLoading(false);
    }
  };

  const cardBackLinkState = useMemo(() => {
    if (!backLinkState) {
      return null;
    }

    return {
      ...backLinkState,
      backLinkTo: {
        pathname: backLinkState.backLinkTo?.pathname || backLinkState.backLinkTo,
        state: {
          ...backLinkState.backLinkTo?.state,
          goalDashboardState: {
            ...backLinkState.backLinkTo?.state?.goalDashboardState,
            selectedGoalIds: selectedGoalIdsForNavigation,
          },
        },
      },
    };
  }, [backLinkState, selectedGoalIdsForNavigation]);

  const handleGoalCheckboxSelect = (event) => {
    markUserInteracted();
    handleCheckboxSelect(event);
  };

  const handleSelectAllGoalsOnPage = (event) => {
    markUserInteracted();
    handleSelectAllPage(event);
  };

  useEffect(() => {
    onSelectionChange(validatedSelectedGoalIds);
  }, [onSelectionChange, validatedSelectedGoalIds]);

  return (
    <>
      <div className="border-top smart-hub-border-base-lighter margin-x-neg-3 margin-top-3 padding-x-3 padding-top-2 padding-bottom-0">
        <div className="margin-left-3 display-flex flex-row flex-align-center">
          <Checkbox
            label="Select all"
            id="goal-dashboard-select-all-goals"
            checked={allPageChecked}
            onChange={handleSelectAllGoalsOnPage}
            disabled={!goals.length}
          />
          <Button
            type="button"
            unstyled
            className="margin-left-2 text-ttahub-blue text-underline"
            onClick={handlePreviewAndPrint}
            disabled={!goals.length || !initialSelectionReady || !hasSelectedGoals}
          >
            Preview and print selected
          </Button>
          {hasSelectedGoals && (
            <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
              <span>{selectionCount} selected </span>
              <Button
                type="button"
                unstyled
                className="smart-hub--select-tag__button"
                aria-label="deselect all goals"
                onClick={clearSelectedGoals}
              >
                <FontAwesomeIcon
                  className="margin-left-1 margin-top-2px filter-pills-cursor"
                  color={colors.ttahubMediumBlue}
                  icon={faTimesCircle}
                />
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
              {allResultsSelected ? 'Clear selection' : `Select all ${goalsCount} goals`}
            </Button>
          </Alert>
        )}
        {selectAllError && (
          <Alert className="margin-top-2" type="error" slim>
            Unable to select all goals. Please try again.
          </Alert>
        )}
      </div>
      <div className="padding-top-2 padding-bottom-2 ttahub-goal-cards">
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
              onGoalDeleted={handleGoalDeletedFromCard}
              backLinkState={cardBackLinkState}
              handleGoalCheckboxSelect={handleGoalCheckboxSelect}
              isChecked={isChecked(goal.id)}
            />
          );
        })}
      </div>
    </>
  );
}

GoalDashboardGoalCards.propTypes = {
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      grant: PropTypes.shape({
        recipientId: PropTypes.number,
        regionId: PropTypes.number,
        recipient: PropTypes.shape({
          name: PropTypes.string,
        }),
      }),
    })
  ).isRequired,
  goalsCount: PropTypes.number,
  allGoalIds: PropTypes.arrayOf(PropTypes.number),
  onGoalDeleted: PropTypes.func,
  onSelectAllGoals: PropTypes.func,
  initialSelectedGoalIds: PropTypes.arrayOf(PropTypes.number),
  onSelectionChange: PropTypes.func,
  onSelectionReadyChange: PropTypes.func,
  backLinkState: PropTypes.shape({
    backLinkTo: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        pathname: PropTypes.string,
        state: PropTypes.shape({
          goalDashboardState: PropTypes.shape({
            perPage: PropTypes.number,
            selectedGoalIds: PropTypes.arrayOf(PropTypes.number),
            sortConfig: PropTypes.shape({
              sortBy: PropTypes.string,
              direction: PropTypes.string,
              activePage: PropTypes.number,
              offset: PropTypes.number,
            }),
          }),
        }),
      }),
    ]),
    backLinkText: PropTypes.string,
  }),
};

GoalDashboardGoalCards.defaultProps = {
  goalsCount: 0,
  allGoalIds: [],
  onGoalDeleted: null,
  onSelectAllGoals: async () => [],
  initialSelectedGoalIds: [],
  onSelectionChange: () => {},
  onSelectionReadyChange: () => {},
  backLinkState: null,
};

export default GoalDashboardGoalCards;
