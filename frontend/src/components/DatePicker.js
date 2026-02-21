/* eslint-disable react/jsx-props-no-spreading */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  DatePicker as RawDatePicker,
} from '@trussworks/react-uswds';
import { DATE_DISPLAY_FORMAT } from '../Constants';
import {
  formatDateValue,
  now,
  parseDateTimeFromFormat,
} from '../lib/dates';
import './DatePicker.scss';

export const DATE_PICKER_DATE_FORMAT = 'YYYY-MM-DD';

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
  const today = useMemo(() => formatDateValue(now().toISO(), DATE_PICKER_DATE_FORMAT), []);

  const formattedDefaultValue = formatDateValue(defaultValue, DATE_PICKER_DATE_FORMAT);

  const formattedMaxDate = maxDate
    ? formatDateValue(maxDate, DATE_PICKER_DATE_FORMAT) : today;
  const formattedMinDate = formatDateValue(minDate, DATE_PICKER_DATE_FORMAT);

  const onBlur = () => {
    const dateAsDateTime = parseDateTimeFromFormat(currentDate, DATE_DISPLAY_FORMAT);
    const minDateAsDateTime = parseDateTimeFromFormat(minDate, DATE_DISPLAY_FORMAT);
    const maxDateAsDateTime = maxDate
      ? parseDateTimeFromFormat(maxDate, DATE_DISPLAY_FORMAT)
      : now().plus({ days: 1 });

    if (!dateAsDateTime) {
      setError(`Please enter a valid date before ${maxDate || 'today'} and after ${minDate}`);
      return;
    }

    if (minDateAsDateTime && dateAsDateTime.toMillis() < minDateAsDateTime.toMillis()) {
      // automatically set the min date to the first available
      if (minDate === '09/01/2020') {
        setError('The date must be after 08/31/2020');
        onChange(minDate);
      } else {
        setError(`Please enter a date after ${minDate}`);
      }
      return;
    }

    if (maxDateAsDateTime && dateAsDateTime.toMillis() > maxDateAsDateTime.toMillis()) {
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
