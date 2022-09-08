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
  inputName,
  isLoading,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName} className={isOnReport ? 'text-bold' : ''}>
        Recipient&apos;s goal
        {' '}
        {!isOnReport ? <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span> : null }
      </Label>
      { isOnReport ? (
        <p className="usa-prose margin-top-0">{goalName}</p>
      ) : (
        <>
          {error}
          <Textarea
            onBlur={() => {
              validateGoalName();
            }}
            id={inputName}
            name={inputName}
            value={goalName}
            onChange={onUpdateText}
            required
            disabled={isLoading}
          />
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
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
};

GoalText.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
