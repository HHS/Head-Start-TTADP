import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';

export default function GoalText({
  error,
  isOnReport,
  goalName,
  validateGoalName,
  onUpdateText,
  inputName,
  isLoading,
  goalStatus,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName} className={isOnReport || goalStatus === 'Closed' ? 'text-bold' : ''}>
        Recipient&apos;s goal
        {' '}
        {!isOnReport ? <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span> : null }
      </Label>
      { isOnReport || goalStatus === 'Closed' ? (
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
  goalStatus: PropTypes.string.isRequired,
};

GoalText.defaultProps = {
  inputName: 'goalText',
  isLoading: false,
};
