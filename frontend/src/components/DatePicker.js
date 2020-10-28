/*
  This component requires being embedded into a `react-hook-form` form

  Uses ReactDatePicker styled as the USWDS date picker. The react USWDS library does
  not have a date picker component. We could have used USWDS component directly here
  instead of ReactDatePicker but I decided against for a couple reasons:
   1. I was having a hard time getting input back into react hook form using the USWDS
      code directly. Issue centered around the USWDS code not sending `onChange` events
      when an invalid date was input
   2. Related to #1, ReactDatePicker handles invalid dates by removing the invalid input
      on blur, which is nicer then how the USWDS component handled invalid dates.
   3. ReactDatePicker had easily readable documentation and conveniences such as `maxDate`
      and `minDate`. I couldn't find great docs using the USWDS datepicker javascript
*/

import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { TextInput, Label } from '@trussworks/react-uswds';
import ReactDatePicker from 'react-datepicker';
import { Controller } from 'react-hook-form';

import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

const DateInput = ({
  control, label, minDate, name, disabled, maxDate,
}) => {
  const labelId = `${name}-id`;
  const hintId = `${name}-hint`;

  const CustomInput = forwardRef(({ value, onChange, onFocus }, ref) => (
    <div className="display-flex" onFocus={onFocus}>
      <TextInput
        id={name}
        disabled={disabled}
        inputRef={ref}
        onChange={onChange}
        className="usa-date-picker__external-input"
        aria-describedby={`${labelId} ${hintId}`}
        value={value}
        autoComplete="off"
      />
      <button disabled={disabled} aria-hidden tabIndex={-1} aria-label="open calendar" type="button" className="usa-date-picker__button" />
    </div>
  ));

  CustomInput.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
  };

  CustomInput.defaultProps = {
    value: undefined,
    onChange: undefined,
    onFocus: undefined,
  };

  return (
    <>
      <Label id={labelId} htmlFor={name}>{label}</Label>
      <div className="usa-hint" id={hintId}>mm/dd/yyyy</div>
      <Controller
        render={({ onChange, value }) => (
          <ReactDatePicker
            dateFormat="MM/dd/yyyy"
            showTimeSelect={false}
            todayButton="Today"
            minDate={minDate}
            maxDate={maxDate}
            strictParsing
            selected={value}
            onChange={onChange}
            customInput={<CustomInput />}
            dropdownMode="select"
            placeholderText="Click to select time"
            shouldCloseOnSelect
          />
        )}
        control={control}
        name={name}
        disabled={disabled}
        defaultValue={null}
        rules={{
          required: true,
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
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
  disabled: PropTypes.bool,
};

DateInput.defaultProps = {
  minDate: undefined,
  maxDate: undefined,
  disabled: false,
};

export default DateInput;
