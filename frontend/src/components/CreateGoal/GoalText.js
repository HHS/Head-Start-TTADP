import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Textarea,
} from '@trussworks/react-uswds';

export default function GoalText({
  error,
  isOnReport,
  goalName,
  validateGoalName,
  onUpdateText,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="goalText" className={isOnReport ? 'text-bold' : ''}>
        Recipient&apos;s goal
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
      </Label>
      { isOnReport ? (
        <p className="usa-prose margin-top-0">{goalName}</p>
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
  isOnReport: PropTypes.bool.isRequired,
  goalName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
};
