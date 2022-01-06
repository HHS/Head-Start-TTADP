import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { useController } from 'react-hook-form/dist/index.ie11';
import {
  DatePicker,
} from '@trussworks/react-uswds';

// this is the format used in every place we see
import { DATE_DISPLAY_FORMAT } from '../Constants';

// this is the format accepted (but seemingly, not returned) by the react DatePicker component
const DATEPICKER_VALUE_FORMAT = 'YYYY-MM-DD';

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
}) {
  /**
   * we don't want to compute these fields multiple times if we don't have to,
   * especially on renders where the underlying dependency doesn't change
   */
  const max = useMemo(() => (isStartDate ? {
    display: moment().format(DATE_DISPLAY_FORMAT),
    moment: moment(),
    datePicker: moment().format(DATEPICKER_VALUE_FORMAT),
    compare: moment(maxDate, DATE_DISPLAY_FORMAT),
  } : {
    display: maxDate,
    moment: moment(maxDate, DATE_DISPLAY_FORMAT),
    datePicker: moment(maxDate, DATE_DISPLAY_FORMAT).format(DATEPICKER_VALUE_FORMAT),
    compare: moment(maxDate, DATE_DISPLAY_FORMAT),
  }), [isStartDate, maxDate]);

  const min = useMemo(() => ({
    display: minDate,
    moment: moment(minDate, DATE_DISPLAY_FORMAT),
    datePicker: moment(minDate, DATE_DISPLAY_FORMAT).format(DATEPICKER_VALUE_FORMAT),
  }), [minDate]);

  const formattedValue = value ? moment(value, DATE_DISPLAY_FORMAT).format(DATEPICKER_VALUE_FORMAT) : '';

  // this is our custom validation function we pass to the hook form controller
  function validate(v) {
    const newValue = moment(v, DATE_DISPLAY_FORMAT);

    if (!newValue.isValid()) {
      return 'Please enter a valid date';
    }

    if (newValue.isBefore(min.moment)) {
      return `Please enter a date after ${min.display}`;
    }

    if (newValue.isAfter(max.moment)) {
      return `Please enter a date before ${max.display}`;
    }

    return true;
  }

  const {
    field: { onChange },
  } = useController({
    name,
    control,
    rules: { validate },
    defaultValue: formattedValue,
  });

  const datePickerOnChange = (d) => {
    if (isStartDate) {
      const newDate = moment(d, DATE_DISPLAY_FORMAT);
      const currentDate = moment(value, DATE_DISPLAY_FORMAT);
      const isBeforeMax = max.compare.isBefore(newDate);
      if (isBeforeMax) {
        const diff = max.compare.diff(currentDate, 'days');
        const newEnd = newDate.add(diff, 'days').format(DATE_DISPLAY_FORMAT);
        setEndDate(newEnd);
      }
    }
    onChange(d);
  };

  return (
    <DatePicker
      defaultValue={formattedValue}
      name={name}
      id={name}
      onChange={datePickerOnChange}
      minDate={min.datePicker}
      maxDate={max.datePicker}
    />
  );
}

ControlledDatePicker.propTypes = {
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  control: PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.string,
    getValues: PropTypes.func,
  }).isRequired,
  isStartDate: PropTypes.bool,
  setEndDate: PropTypes.func,
};

ControlledDatePicker.defaultProps = {
  minDate: '09/01/2020',
  maxDate: moment().format(DATE_DISPLAY_FORMAT),
  isStartDate: false,
  setEndDate: () => {},
};
