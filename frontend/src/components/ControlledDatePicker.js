import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  format, parse, isBefore, isAfter, differenceInDays, addDays,
} from 'date-fns';
import { useController } from 'react-hook-form';
import {
  DatePicker,
} from '@trussworks/react-uswds';
import { isValidDate } from '../utils';

// this is the format used in every place we see
import { DATE_DISPLAY_FORMAT, DATEPICKER_VALUE_FORMAT } from '../Constants';

// the only props we **need** to provide are name and control
// (control being necessary to implement this component within react hook form)
export default function ControlledDatePicker({
  name,
  value,
  control,
  minDate,
  maxDate,
  setEndDate,
  isStartDate,
  inputId,
  endDate,
  customValidationMessages,
  required,
  additionalValidation,
}) {
  /**
   * we don't want to compute these fields multiple times if we don't have to,
   * especially on renders where the underlying dependency doesn't change
   */
  const max = useMemo(() => {
    const maxDateParsed = parse(maxDate, DATE_DISPLAY_FORMAT, new Date());
    return isStartDate ? {
      display: format(new Date(), DATE_DISPLAY_FORMAT),
      date: maxDateParsed,
      datePicker: format(maxDateParsed, DATEPICKER_VALUE_FORMAT),
      compare: maxDateParsed,
    } : {
      display: maxDate,
      date: maxDateParsed,
      datePicker: format(maxDateParsed, DATEPICKER_VALUE_FORMAT),
      compare: maxDateParsed,
    };
  }, [isStartDate, maxDate]);

  const endDateMax = useMemo(() => {
    const endDateParsed = parse(endDate, DATE_DISPLAY_FORMAT, new Date());
    return {
      display: format(new Date(), DATE_DISPLAY_FORMAT),
      date: endDateParsed,
      datePicker: format(endDateParsed, DATEPICKER_VALUE_FORMAT),
      compare: endDateParsed,
    };
  }, [endDate]);

  const min = useMemo(() => {
    const minDateParsed = parse(minDate, DATE_DISPLAY_FORMAT, new Date());
    return {
      display: minDate,
      date: minDateParsed,
      datePicker: format(minDateParsed, DATEPICKER_VALUE_FORMAT),
    };
  }, [minDate]);

  const formattedValue = value ? format(parse(value, DATE_DISPLAY_FORMAT, new Date()), DATEPICKER_VALUE_FORMAT) : '';

  const {
    beforeMessage,
    afterMessage,
    invalidMessage,
  } = customValidationMessages;

  // this is our custom validation function we pass to the hook form controller
  function validate(v) {
    const newValue = isValidDate(v);
    if (!newValue) return invalidMessage || 'Enter valid date';

    if (isBefore(newValue, min.date)) {
      return afterMessage || `Please enter a date after ${min.display}`;
    }

    if (isAfter(newValue, max.compare)) {
      return beforeMessage || `Please enter a date before ${max.display}`;
    }

    // Call any additional validation logic.
    const customValidationMsg = additionalValidation();
    if (customValidationMsg) {
      return customValidationMsg;
    }

    return true;
  }

  const {
    field: { onChange, onBlur: onFieldBlur },
  } = useController({
    name,
    control,
    rules: { validate },
    defaultValue: formattedValue,
  });

  const handleOnBlur = useCallback((e) => {
    if (e.nativeEvent && e.nativeEvent.relatedTarget) {
      // we don't want blur to trigger on the date picker itself, including the calendar icon
      if (e.nativeEvent.relatedTarget.matches('.usa-date-picker__button')) {
        return;
      }
    }

    onFieldBlur(e);
  }, [onFieldBlur]);

  const datePickerOnChange = (d) => {
    if (isStartDate) {
      const newDate = parse(d, DATE_DISPLAY_FORMAT, new Date());
      const currentDate = parse(value, DATE_DISPLAY_FORMAT, new Date());
      if (isBefore(endDateMax.compare, newDate)) {
        const diff = differenceInDays(endDateMax.compare, currentDate);
        const newEnd = addDays(newDate, diff);
        setEndDate(format(newEnd, DATE_DISPLAY_FORMAT));
      }
    }
    onChange(d);
  };

  return (
    <DatePicker
      defaultValue={formattedValue}
      name={inputId}
      id={inputId}
      onChange={datePickerOnChange}
      minDate={min.datePicker}
      maxDate={max.datePicker}
      onBlur={(e) => handleOnBlur(e)}
      required={required}
    />
  );
}

ControlledDatePicker.propTypes = {
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  control: PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.string,
    getValues: PropTypes.func,
  }).isRequired,
  isStartDate: PropTypes.bool,
  setEndDate: PropTypes.func,
  inputId: PropTypes.string.isRequired,
  endDate: PropTypes.string,
  required: PropTypes.bool,
  customValidationMessages: PropTypes.shape({
    beforeMessage: PropTypes.string,
    afterMessage: PropTypes.string,
    invalidMessage: PropTypes.string,
  }),
  additionalValidation: PropTypes.func,
};

ControlledDatePicker.defaultProps = {
  minDate: '09/01/2020',
  maxDate: '',
  endDate: '',
  isStartDate: false,
  setEndDate: () => {},
  required: true,
  value: '',
  customValidationMessages: {
    beforeMessage: '',
    afterMessage: '',
    invalidMessage: '',
  },
  additionalValidation: () => {},
};
