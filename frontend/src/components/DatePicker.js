/* eslint-disable react/jsx-props-no-spreading */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker as RawDatePicker,
} from '@trussworks/react-uswds';
import {
  format, parse, isValid, isBefore, isAfter, addDays,
} from 'date-fns';
import { DATE_DISPLAY_FORMAT } from '../Constants';
import './DatePicker.scss';

export const DATE_PICKER_DATE_FORMAT = 'yyyy-MM-dd';

// this is just a pass through component to simplify the date formats not
// matching and the way the USDWS is weird about the change/values not all matching
// we are also doing a little of our validation on the side
export default function DatePicker(
  {
    onChange,
    defaultValue,
    minDate,
    maxDate,
    datePickerKey,
    error,
    setError,
    ...props
  },
) {
  const [currentDate, setCurrentDate] = useState('');
  const today = useMemo(() => format(new Date(), DATE_PICKER_DATE_FORMAT), []);

  const parsedDefaultValue = defaultValue
    ? parse(defaultValue, DATE_DISPLAY_FORMAT, new Date())
    : null;
  const formattedDefaultValue = parsedDefaultValue && isValid(parsedDefaultValue)
    ? format(parsedDefaultValue, DATE_PICKER_DATE_FORMAT)
    : '';

  const formattedMaxDate = maxDate
    ? (() => {
      const parsedMaxDate = parse(maxDate, DATE_DISPLAY_FORMAT, new Date());
      return isValid(parsedMaxDate) ? format(parsedMaxDate, DATE_PICKER_DATE_FORMAT) : today;
    })()
    : today;
  const formattedMinDate = (() => {
    const parsedMinDate = parse(minDate, DATE_DISPLAY_FORMAT, new Date());
    return isValid(parsedMinDate)
      ? format(parsedMinDate, DATE_PICKER_DATE_FORMAT)
      : format(parse('09/01/2020', DATE_DISPLAY_FORMAT, new Date()), DATE_PICKER_DATE_FORMAT);
  })();

  const onBlur = () => {
    const dateAsDate = parse(currentDate, DATE_DISPLAY_FORMAT, new Date());
    const minDateAsDate = parse(minDate, DATE_DISPLAY_FORMAT, new Date());
    const maxDateAsDate = maxDate
      ? parse(maxDate, DATE_DISPLAY_FORMAT, new Date())
      : addDays(new Date(), 1);

    if (!isValid(dateAsDate)) {
      setError(`Please enter a valid date before ${maxDate || 'today'} and after ${minDate}`);
      return;
    }

    if (isBefore(dateAsDate, minDateAsDate)) {
      // automatically set the min date to the first available
      if (minDate === '09/01/2020') {
        setError('The date must be after 08/31/2020');
        onChange(minDate);
      } else {
        setError(`Please enter a date after ${minDate}`);
      }
      return;
    }

    if (isAfter(dateAsDate, maxDateAsDate)) {
      setError(`Please enter a date before ${maxDate || 'today'}`);
      return;
    }

    setError('');
    onChange(currentDate);
  };

  return (
    <>
      {error && <span className="usa-error-message">{error}</span>}
      <RawDatePicker
        {...props}
        key={datePickerKey}
        maxDate={formattedMaxDate}
        minDate={formattedMinDate}
        defaultValue={formattedDefaultValue}
        onChange={setCurrentDate}
        onBlur={onBlur}
      />
    </>
  );
}

DatePicker.propTypes = {
  onChange: PropTypes.func.isRequired,
  defaultValue: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  datePickerKey: PropTypes.string,
  error: PropTypes.string.isRequired,
  setError: PropTypes.func.isRequired,
};

DatePicker.defaultProps = {
  defaultValue: '',
  minDate: '09/01/2020',
  maxDate: '',
  datePickerKey: 'date-picker',
};
