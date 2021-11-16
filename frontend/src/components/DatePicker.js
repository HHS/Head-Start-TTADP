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
import { SingleDatePicker, isInclusivelyBeforeDay } from 'react-dates';
import { OPEN_UP, OPEN_DOWN } from 'react-dates/constants';
import { Controller } from 'react-hook-form/dist/index.ie11';
import moment from 'moment';
import { DATE_DISPLAY_FORMAT, EARLIEST_INC_FILTER_DATE } from '../Constants';
import './DatePicker.css';

const DateInput = ({
  control,
  maxDate,
  name,
  disabled,
  openUp,
  required,
  ariaName,
  isStartDate,
  setEndDate,
}) => {
  const hintId = `${name}-hint`;
  const [isFocused, updateFocus] = useState(false);
  const openDirection = openUp ? OPEN_UP : OPEN_DOWN;

  const isOutsideRange = (day) => isInclusivelyBeforeDay(day, EARLIEST_INC_FILTER_DATE);

  const message = isFocused ? '' : 'Navigate forward and push button to open the calendar';

  return (
    <>
      <div className="usa-hint font-body-2xs" id={hintId}>mm/dd/yyyy</div>
      <Controller
        render={({ onChange, value, ref }) => {
          const date = value ? moment(value, DATE_DISPLAY_FORMAT) : null;
          return (
            <div className="display-flex smart-hub--date-picker-input">
              <SingleDatePicker
                id={name}
                ariaLabel={`${ariaName}, month/day/year, edit text`}
                placeholder={null}
                focused={isFocused}
                date={date}
                ref={ref}
                isOutsideRange={isOutsideRange}
                numberOfMonths={1}
                screenReaderInputMessage={message}
                openDirection={openDirection}
                disabled={disabled}
                hideKeyboardShortcutsPanel
                onDateChange={(d) => {
                  if (!d) {
                    return;
                  }

                  if (isStartDate) {
                    if (maxDate && moment(maxDate).isBefore(d)) {
                      const diff = moment(maxDate).diff(date, 'days');
                      const newEnd = moment(d).add(diff, 'days').format(DATE_DISPLAY_FORMAT);
                      setEndDate(newEnd);
                    }
                  }

                  const newDate = d ? d.format(DATE_DISPLAY_FORMAT) : d;
                  onChange(newDate);
                  const input = document.getElementById(name);
                  if (input) input.focus();
                }}
                onFocusChange={({ focused }) => {
                  if (!focused) {
                    updateFocus(focused);
                  }
                }}
              />
              <button
                onClick={() => { updateFocus(true); }}
                disabled={disabled}
                aria-label={`${ariaName} open calendar"`}
                type="button"
                className="usa-date-picker__button margin-top-0"
              />
            </div>
          );
        }}
        control={control}
        name={name}
        disabled={disabled}
        defaultValue={null}
        rules={{
          required: required ? 'Please select a date' : false,
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
  ariaName: PropTypes.string.isRequired,
  maxDate: PropTypes.string,
  openUp: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  isStartDate: PropTypes.bool,
  setEndDate: PropTypes.func,
};

DateInput.defaultProps = {
  maxDate: '',
  disabled: false,
  openUp: false,
  required: true,
  isStartDate: false,
  setEndDate: () => {},
};

export default DateInput;
