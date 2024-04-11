import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';
import Req from '../Req';

export default function GoalText({
  error,
  goalName,
  validateGoalName,
  onUpdateText,
  inputName,
  isLoading,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName}>
        Recipient&apos;s goal
        {' '}
        <Req />
      </Label>
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
    </FormGroup>
  );
}

GoalText.propTypes = {
  error: PropTypes.node.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
};

GoalText.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
