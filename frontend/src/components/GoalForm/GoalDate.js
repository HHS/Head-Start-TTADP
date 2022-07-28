import React from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker, FormGroup, Label,
} from '@trussworks/react-uswds';
import QuestionTooltip from './QuestionTooltip';

export default function GoalDate({
  error,
  setEndDate,
  endDate,
  validateEndDate,
  datePickerKey,
  inputName,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName}>
        Estimated close date (mm/dd/yyyy)
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        <QuestionTooltip text="When do you expect to end TTA work and mark this goal as closed?" />
      </Label>
      {error}
      <DatePicker
        id={inputName}
        name={inputName}
        onChange={setEndDate}
        defaultValue={endDate}
        onBlur={validateEndDate}
        key={datePickerKey}
        required
      />
    </FormGroup>
  );
}

GoalDate.propTypes = {
  error: PropTypes.node.isRequired,
  setEndDate: PropTypes.func.isRequired,
  endDate: PropTypes.string, // can come back from the API as null
  validateEndDate: PropTypes.func.isRequired,
  datePickerKey: PropTypes.string.isRequired,
  inputName: PropTypes.string,
};

GoalDate.defaultProps = {
  endDate: '',
  inputName: 'goalEndDate',
};
