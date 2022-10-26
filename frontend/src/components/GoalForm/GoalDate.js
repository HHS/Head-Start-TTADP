import React from 'react';
import moment from 'moment';
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
  inputName,
  isLoading,
  goalStatus,
}) {
  if (goalStatus === 'Closed') {
    if (endDate && endDate !== 'Invalid date') {
      return (
        <>
          <p className="usa-prose text-bold margin-bottom-0">
            Anticipated close date (mm/dd/yyyy)
          </p>
          <p className="usa-prose margin-0">{endDate}</p>
        </>
      );
    }

    return null;
  }

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName}>
        Anticipated close date (mm/dd/yyyy)
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
        <QuestionTooltip text="When do you expect to end TTA work and mark this goal as closed?" />
      </Label>
      {error}
      <DatePicker
        id={inputName}
        name={inputName}
        onChange={setEndDate}
        defaultValue={moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')}
        onBlur={validateEndDate}
        disabled={isLoading}
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
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
};

GoalDate.defaultProps = {
  endDate: '',
  inputName: 'goalEndDate',
  isLoading: false,
};
