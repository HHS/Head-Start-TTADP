import React, {
  useState, useEffect, useRef, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Checkbox,
  Button,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext } from 'react-hook-form';
import { similiarGoalsByText } from '../../fetchers/goals';
import { getGoalTemplates } from '../../fetchers/goalTemplates';
import useAsyncDebounceEffect from '../../hooks/useAsyncDebounceEffect';
import GoalNudgeText from './GoalNudgeText';
import GoalNudgeInitiativePicker from './GoalNudgeInitiativePicker';

const MINIMUM_GOAL_NAME_LENGTH = 15;

export default function GoalNudge({
  recipientId,
  regionId,
  selectedGrant,
}) {
  const {
    watch, register, setValue, clearErrors,
  } = useFormContext();
  const {
    goalName,
    isGoalNameEditable,
    useOhsInitiativeGoal,
  } = watch();
  const initiativeRef = useRef(null);

  const [similar, setSimilarGoals] = useState([]);
  const [dismissSimilar, setDismissSimilar] = useState(false);
  const [goalTemplates, setGoalTemplates] = useState(null);

  const selectedGrants = useMemo(() => [selectedGrant], [selectedGrant]);

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

    // we should clear out any errors when useOhsInitiativeGoal is toggled
    clearErrors();
  }, [clearErrors, setValue, useOhsInitiativeGoal]);

  // using DeepCompareEffect to avoid unnecessary fetches
  // as we have an object (selectedGrant) in the dependency array
  useDeepCompareEffect(() => {
    async function fetchGoalTemplates() {
      try {
        const templates = await getGoalTemplates(selectedGrants.map((grant) => grant.id));
        setGoalTemplates(templates);
      } catch (err) {
        setGoalTemplates([]);
      }
    }

    if (selectedGrants[0] && selectedGrants[0].id) {
      fetchGoalTemplates();
    }
  }, [selectedGrants]);

  useAsyncDebounceEffect(async () => {
    // we need all of these to populate the query
    if (!recipientId || !regionId || !selectedGrant || !selectedGrant.number) {
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
  }, [dismissSimilar, goalName, recipientId, regionId, selectedGrant]);

  // what a hack
  const checkboxZed = similar.length && !useOhsInitiativeGoal && !dismissSimilar ? 'z-bottom' : '';

  return (
    <div className="ttahub-goal-nudge--container position-relative margin-bottom-3">
      <GoalNudgeText
        similar={similar}
        dismissSimilar={dismissSimilar}
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
