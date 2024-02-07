import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Checkbox,
} from '@trussworks/react-uswds';
import { similiarGoalsByText } from '../../fetchers/goals';
import { getGoalTemplates } from '../../fetchers/goalTemplates';
import useDebounceEffect from '../../hooks/useDebounceEffect';
import GoalNudgeText from './GoalNudgeText';
import GoalNudgeInitiativePicker from './GoalNudgeInitiativePicker';

const MINIMUM_GOAL_NAME_LENGTH = 15;

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

  useEffect(() => {
    async function fetchGoalTemplates() {
      try {
        if (!goalTemplates) {
          const templates = await getGoalTemplates(selectedGrants.map((grant) => grant.id));
          setGoalTemplates(templates);
        }
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    if (useOhsInitiativeGoal && !goalTemplates) {
      fetchGoalTemplates();
    }
  }, [goalTemplates, selectedGrants, useOhsInitiativeGoal]);

  useDebounceEffect(async () => {
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

  return (
    <>
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
        goalTemplates={goalTemplates}
      />
      <Checkbox
        id="use-ohs-initiative-goal"
        name="use-ohs-initiative-goal"
        label="Use OHS initiative goal"
        className="margin-top-2"
        onChange={() => setUseOhsInitiativeGoal(!useOhsInitiativeGoal)}
        checked={useOhsInitiativeGoal}
      />
    </>
  );
}

GoalNudge.propTypes = {
  error: PropTypes.node.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  regionId: PropTypes.number.isRequired,
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
