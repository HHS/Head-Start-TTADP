/*
  This component requires being embedded into a `react-hook-form` form

  Uses react-dates styled as the USWDS date picker. The react USWDS library does
  not have a date picker component. We could have used USWDS component directly here
  instead of react-dates but I decided against for a couple reasons:
   1. I was having a hard time getting input back into react hook form using the USWDS
      code directly. Issue centered around the USWDS code not sending `onChange` events
      when an invalid date was input
   2. react-dates had easily readable documentation and conveniences such as `maxDate`
      and `minDate`. I couldn't find great docs using the USWDS datepicker javascript
*/

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { SingleDatePicker } from 'react-dates';
import { OPEN_UP, OPEN_DOWN } from 'react-dates/constants';
import { Controller } from 'react-hook-form';
import moment from 'moment';

import './DatePicker.css';

const dateFmt = 'MM/DD/YYYY';

const DateInput = ({
  control, label, minDate, name, disabled, maxDate, openUp, required,
}) => {
  const labelId = `${name}-id`;
  const hintId = `${name}-hint`;
  const [isFocused, updateFocus] = useState(false);
  const openDirection = openUp ? OPEN_UP : OPEN_DOWN;

  const isOutsideRange = (date) => {
    const isBefore = minDate && date.isBefore(moment(minDate, dateFmt));
    const isAfter = maxDate && date.isAfter(moment(maxDate, dateFmt));

    return isBefore || isAfter;
  };

  return (
    <>
      <Label id={labelId} htmlFor={name}>{label}</Label>
      <div className="usa-hint" id={hintId}>mm/dd/yyyy</div>
      <Controller
        render={({ onChange, value, ref }) => {
          const date = value ? moment(value, dateFmt) : null;
          return (
            <div className="display-flex smart-hub--date-picker-input">
              <button onClick={() => { updateFocus(true); }} disabled={disabled} tabIndex={-1} aria-label="open calendar" type="button" className="usa-date-picker__button margin-top-0" />
              <SingleDatePicker
                id={name}
                focused={isFocused}
                date={date}
                ref={ref}
                isOutsideRange={isOutsideRange}
                numberOfMonths={1}
                openDirection={openDirection}
                disabled={disabled}
                onDateChange={(d) => { onChange(d.format(dateFmt)); }}
                onFocusChange={({ focused }) => updateFocus(focused)}
              />
            </div>
          );
        }}
        control={control}
        name={name}
        disabled={disabled}
        defaultValue={null}
        rules={{
          required,
        }}
      />
    </>
  );
};

DateInput.propTypes = {
  // control is an object from react-hook-form
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  openUp: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
};

DateInput.defaultProps = {
  minDate: '',
  maxDate: '',
  disabled: false,
  openUp: false,
  required: true,
};

export default DateInput;
