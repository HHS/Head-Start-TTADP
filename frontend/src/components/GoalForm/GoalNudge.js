import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Checkbox,
  Button,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import { similiarGoalsByText } from '../../fetchers/goals';
import { getGoalTemplates } from '../../fetchers/goalTemplates';
import useAsyncDebounceEffect from '../../hooks/useAsyncDebounceEffect';
import GoalNudgeText from './GoalNudgeText';
import GoalNudgeInitiativePicker from './GoalNudgeInitiativePicker';

const MINIMUM_GOAL_NAME_LENGTH = 15;

export default function GoalNudge({
  selectedGrant,
  recipientId,
  regionId,
}) {
  const { watch, register, setValue } = useFormContext();
  const { goalName, isGoalNameEditable, useOhsInitiativeGoal } = watch();
  const initiativeRef = useRef(null);

  const [similar, setSimilarGoals] = useState([]);
  const [dismissSimilar, setDismissSimilar] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState(null);

  useEffect(() => {
    if (dismissSimilar) {
      setSimilarGoals([]);
    }
  }, [dismissSimilar]);

  useEffect(() => {
    if (useOhsInitiativeGoal && initiativeRef.current) {
      initiativeRef.current.focus();
      // should also clear out the goal name
      setValue('goalName', '');
    }
  }, [setValue, useOhsInitiativeGoal]);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrants) in the dependency array
  useEffect(() => {
    async function fetchGoalTemplates() {
      try {
        const templates = await getGoalTemplates([selectedGrant.id]);
        setGoalTemplates(templates);
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    if (selectedGrant) {
      fetchGoalTemplates();
    }
  }, [selectedGrant]);

  useAsyncDebounceEffect(async () => {
    // we need all of these to populate the query
    if (!recipientId || !regionId || !selectedGrant) {
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
          [selectedGrant.number],
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
    selectedGrant,
    dismissSimilar,
  ]);

  // what a hack
  const checkboxZed = similar.length && !useOhsInitiativeGoal && !dismissSimilar ? 'z-bottom' : '';

  return (
    <div className="ttahub-goal-nudge--container position-relative margin-bottom-3">
      <GoalNudgeText
        similar={similar}
        setDismissSimilar={setDismissSimilar}
        useOhsInitiativeGoal={useOhsInitiativeGoal}
      />
      <GoalNudgeInitiativePicker
        useOhsInitiativeGoal={useOhsInitiativeGoal}
        goalTemplates={goalTemplates || []}
        initiativeRef={initiativeRef}
      />
      {isGoalNameEditable && (
      <div className="desktop:display-flex flex-justify margin-top-1 smart-hub-maxw-form-field">
        <Checkbox
          id="useOhsInitiativeGoal"
          name="useOhsInitiativeGoal"
          label="Use OHS standard goal"
          className={`position-relative ${checkboxZed}`}
          defaultChecked={false}
          inputRef={register()}
        />
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
      )}
    </div>
  );
}

GoalNudge.propTypes = {
  regionId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  recipientId: PropTypes.number.isRequired,
  selectedGrant: PropTypes.shape({
    numberWithProgramTypes: PropTypes.string,
    number: PropTypes.string,
    id: PropTypes.number,
  }),
};

GoalNudge.defaultProps = {
  selectedGrant: null,
};
