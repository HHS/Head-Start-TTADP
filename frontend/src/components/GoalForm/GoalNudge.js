import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';
import Req from '../Req';
import { similiarGoalsByText } from '../../fetchers/goals';
import useDebounceEffect from '../../hooks/useDebounceEffect';

export default function GoalNudge({
  error,
  isOnReport,
  goalName,
  validateGoalName,
  onUpdateText,
  inputName,
  isLoading,
  goalStatus,
  userCanEdit,
  selectedGrants,
  recipientId,
  regionId,
}) {
  const [, setSimilarGoals] = useState([]);

  useDebounceEffect(async () => {
    // we need all of these to populate the query
    if (!recipientId || !regionId || !selectedGrants.length) {
      return;
    }

    // we shouldn't run any such query until the user has typed at least 15 characters
    if (goalName.length > 15) {
      const similarities = await similiarGoalsByText(
        regionId,
        recipientId,
        goalName,
        selectedGrants.map((grant) => grant.number),
      );
      setSimilarGoals(similarities);
    }
  }, [goalName, regionId, recipientId, selectedGrants]);

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName} className={isOnReport || goalStatus === 'Closed' ? 'text-bold' : ''}>
        Recipient&apos;s goal
        {' '}
        {!isOnReport ? <Req /> : null }
      </Label>
      { isOnReport || goalStatus === 'Closed' || !userCanEdit ? (
        <p className="usa-prose margin-top-0">{goalName}</p>
      ) : (
        <>
          {error}
          <AutomaticResizingTextarea
            onUpdateText={onUpdateText}
            onBlur={() => {
              validateGoalName();
            }}
            inputName={inputName}
            disabled={isLoading}
            value={goalName}
            required
          />
        </>
      )}
    </FormGroup>
  );
}

GoalNudge.propTypes = {
  error: PropTypes.node.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
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
