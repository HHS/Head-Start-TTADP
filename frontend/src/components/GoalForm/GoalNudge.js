import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';
import Req from '../Req';
// import { similiarGoalsByText } from '../../fetchers/goals';

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
  const onChangeHandler = async (e) => {
    // await similiarGoalsByText();
    // console.log({ selectedGrants, recipientId, regionId });

    onUpdateText(e);
  };

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
            onUpdateText={onChangeHandler}
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
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
};

GoalNudge.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
