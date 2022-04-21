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
  onBlur,
  inputName,
}) {
  const onBlurHandler = () => {
    onBlur();
    validateGoalName();
  };

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="goalText" className={isOnReport ? 'text-bold' : ''}>
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
            onBlur={onBlurHandler}
            id={inputName}
            name={inputName}
            required
            value={goalName}
            onChange={onUpdateText}
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
  onBlur: PropTypes.func,
  inputName: PropTypes.string,
};

GoalText.defaultProps = {
  onBlur: () => {},
  inputName: 'goalText',
};
