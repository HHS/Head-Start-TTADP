import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';

export default function GoalText({
  error,
  isOnApprovedReport,
  goalName,
  validateGoalName,
  onUpdateText,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="goalText">
        Recipient&apos;s goal
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
      </Label>
      { isOnApprovedReport ? (
        <p className="margin-top-0">{goalName}</p>
      ) : (
        <>
          {error}
          <Textarea onBlur={validateGoalName} id="goalText" name="goalText" required value={goalName} onChange={onUpdateText} />
        </>
      )}
    </FormGroup>
  );
}

GoalText.propTypes = {
  error: PropTypes.node.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
};
