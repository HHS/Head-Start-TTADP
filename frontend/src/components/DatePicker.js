/* eslint-disable react/jsx-props-no-spreading */
import React, { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker as RawDatePicker,
} from '@trussworks/react-uswds';

import moment from 'moment';
import { DATE_DISPLAY_FORMAT } from '../Constants';

const DATE_PICKER_DATE_FORMAT = 'YYYY-MM-DD';
// this is just a pass through to simplify the date formats not
// matching and the way the USDWS is weird about the change/values not all matching

export default function DatePicker(
  {
    onChange,
    defaultValue,
    minDate,
    maxDate,
    datePickerKey,
    ...props
  },
) {
  const [error, setError] = useState('');
  const dpRef = useRef();

  const tomorrow = useMemo(() => moment().add(1, 'days').format(DATE_PICKER_DATE_FORMAT), []);

  const onDatePickerChange = (date) => {
    if (dpRef.current && dpRef.current.querySelector(':invalid')) {
      setError('Please enter a valid date');
    } else {
      onChange(date);
    }
  };

  const formattedDefaultValue = moment(
    defaultValue, DATE_DISPLAY_FORMAT,
  ).format(DATE_PICKER_DATE_FORMAT);

  const formattedMaxDate = maxDate
    ? moment(maxDate, DATE_DISPLAY_FORMAT).format(DATE_PICKER_DATE_FORMAT) : tomorrow;
  const formattedMinDate = moment(minDate, DATE_DISPLAY_FORMAT).format(DATE_PICKER_DATE_FORMAT);

  return (
    <span ref={dpRef}>
      {error && <span className="usa-error-message">{error}</span> }
      <RawDatePicker
        {...props}
        key={datePickerKey}
        maxDate={formattedMaxDate}
        minDate={formattedMinDate}
        defaultValue={formattedDefaultValue}
        onChange={onDatePickerChange}
      />
    </span>
  );
}

DatePicker.propTypes = {
  onChange: PropTypes.func.isRequired,
  defaultValue: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  datePickerKey: PropTypes.string,
};

DatePicker.defaultProps = {
  defaultValue: '',
  minDate: '09/02/2020',
  maxDate: '',
  datePickerKey: 'date-picker',
};
