import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Checkbox,
  Button,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { similiarGoalsByText } from '../../fetchers/goals';
import { getGoalTemplates } from '../../fetchers/goalTemplates';
import useAsyncDebounceEffect from '../../hooks/useAsyncDebounceEffect';
import GoalNudgeText from './GoalNudgeText';
import GoalNudgeInitiativePicker from './GoalNudgeInitiativePicker';

const MINIMUM_GOAL_NAME_LENGTH = 15;

export const filterOutGrantUsedGoalTemplates = (goalTemplates, selectedGrants) => goalTemplates
  .filter((template) => {
    if (!template.goals || !template.goals.length) {
      return true;
    }
    const usedGrantIds = template.goals.map((goal) => goal.grantId);
    return !selectedGrants.some((grant) => usedGrantIds.includes(grant.id));
  });
export default function GoalNudge({
  error,
  goalName,
  validateGoalName,
  onUpdateText,
  inputName,
  isLoading,
  selectedGrants,
  recipientId,
  regionId,
  onSelectNudgedGoal,
}) {
  const [similar, setSimilarGoals] = useState([]);
  const [useOhsInitiativeGoal, setUseOhsInitiativeGoal] = useState(false);
  const [dismissSimilar, setDismissSimilar] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState(null);

  useEffect(() => {
    if (dismissSimilar) {
      setSimilarGoals([]);
    }
  }, [dismissSimilar]);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrants) in the dependency array
  useDeepCompareEffect(() => {
    async function fetchGoalTemplates() {
      try {
        const templates = await getGoalTemplates(selectedGrants.map((grant) => grant.id));
        setGoalTemplates(filterOutGrantUsedGoalTemplates(templates, selectedGrants));
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    if (selectedGrants && selectedGrants.length > 0) {
      fetchGoalTemplates();
    }
  }, [selectedGrants]);

  useAsyncDebounceEffect(async () => {
    // we need all of these to populate the query
    if (!recipientId || !regionId || !selectedGrants.length) {
      return;
    }

    if (dismissSimilar) {
      return;
    }

    try {
    // we shouldn't run any such query until the user
      // has typed a minimum number of characters
      if (goalName.length > MINIMUM_GOAL_NAME_LENGTH) {
        const similarities = await similiarGoalsByText(
          regionId,
          recipientId,
          goalName,
          selectedGrants.map((grant) => grant.number),
        );
        setSimilarGoals(similarities);
      }
    } catch (err) {
      setSimilarGoals([]);
    }
  }, [
    goalName,
    regionId,
    recipientId,
    selectedGrants,
    dismissSimilar,
  ]);

  const onChange = (e) => {
    onUpdateText(e.target.value);
  };

  // what a hack
  const checkboxZed = similar.length && !useOhsInitiativeGoal && !dismissSimilar ? 'z-bottom' : '';

  return (
    <div className="ttahub-goal-nudge--container position-relative">
      <GoalNudgeText
        error={error}
        inputName={inputName}
        validateGoalName={validateGoalName}
        goalName={goalName}
        onChange={onChange}
        isLoading={isLoading}
        similar={similar}
        onSelectNudgedGoal={onSelectNudgedGoal}
        setDismissSimilar={setDismissSimilar}
        useOhsInitiativeGoal={useOhsInitiativeGoal}
      />
      <GoalNudgeInitiativePicker
        error={error}
        useOhsInitiativeGoal={useOhsInitiativeGoal}
        validateGoalName={validateGoalName}
        goalTemplates={goalTemplates || []}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />
      <div className="desktop:display-flex flex-justify margin-top-2 smart-hub-maxw-form-field">
        { (goalTemplates && goalTemplates.length > 0) && (
        <Checkbox
          id="use-ohs-initiative-goal"
          name="use-ohs-initiative-goal"
          label="Use OHS initiative goal"
          className={`position-relative ${checkboxZed}`}
          onChange={() => setUseOhsInitiativeGoal(!useOhsInitiativeGoal)}
          checked={useOhsInitiativeGoal}
        />
        )}
        {(dismissSimilar && !useOhsInitiativeGoal) && (
        <Button
          type="button"
          unstyled
          onClick={() => setDismissSimilar(false)}
        >
          Get suggestions
        </Button>
        )}
      </div>
    </div>
  );
}

GoalNudge.propTypes = {
  error: PropTypes.node.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  regionId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  recipientId: PropTypes.number.isRequired,
  selectedGrants: PropTypes.arrayOf(
    PropTypes.shape({
      numberWithProgramTypes: PropTypes.string,
      number: PropTypes.string,
      id: PropTypes.number,
    }),
  ).isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
};

GoalNudge.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
