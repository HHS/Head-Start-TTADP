import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Label,
  Textarea,
} from '@trussworks/react-uswds';
import Req from '../Req';
import { similiarGoalsByText } from '../../fetchers/goals';
import useDebounceEffect from '../../hooks/useDebounceEffect';
import SimilarGoals from './SimilarGoals';

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
}) {
  const [similar, setSimilarGoals] = useState([]);
  const [dismissSimilar, setDismissSimilar] = useState(false);

  useEffect(() => {
    if (dismissSimilar) {
      setSimilarGoals([]);
    }
  }, [dismissSimilar]);

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
  }, [goalName, regionId, recipientId, selectedGrants]);

  const onChange = (e) => {
    onUpdateText(e.target.value);
  };

  return (
    <FormGroup error={error.props.children} className="position-relative">
      <Label htmlFor={inputName}>
        Recipient&apos;s goal
        {' '}
        <Req />
      </Label>

      <>
        {error}
        <Textarea
          onBlur={() => {
            validateGoalName();
          }}
          id={inputName}
          name={inputName}
          value={goalName}
          onChange={onChange}
          required
          disabled={isLoading}
          style={{ height: '160px' }}
        />
        <SimilarGoals similar={similar} setDismissSimilar={setDismissSimilar} />
      </>
    </FormGroup>
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
};

GoalNudge.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
