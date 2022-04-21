import React from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker, FormGroup, Label,
} from '@trussworks/react-uswds';
import QuestionTooltip from './QuestionTooltip';
import { formatEndDateForPicker } from './constants';

export default function GoalDate({
  error,
  setEndDate,
  endDate,
  validateEndDate,
  datePickerKey,
  onBlur,
  inputRef,
  inputName,
}) {
  const f = formatEndDateForPicker(endDate);

  const onBlurHandler = () => {
    onBlur();
    validateEndDate();
  };

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="goalEndDate">
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
        defaultValue={f}
        onBlur={onBlurHandler}
        key={datePickerKey}
        inputRef={inputRef}
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
  onBlur: PropTypes.func,
  inputRef: PropTypes.oneOfType([
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
    PropTypes.bool,
  ]),
  inputName: PropTypes.string,
};

GoalDate.defaultProps = {
  endDate: '',
  onBlur: () => {},
  inputRef: false,
  inputName: 'goalEndDate',
};
