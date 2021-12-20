/* eslint-disable react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Controller } from 'react-hook-form/dist/index.ie11';
import {
  DatePicker,
} from '@trussworks/react-uswds';

export default function ControlledDatePicker({ fieldName, control }) {
  console.log(typeof control);

  return (
    <Controller
      name={fieldName}
      control={control}
      render={(props) => {
        // eslint-disable-next-line react/prop-types
        const { value, onChange, name } = props;

        console.log(props);
        const datePickerOnChange = (e) => {
          console.log(e);
          onChange(e);
        };

        const formattedValue = moment(value).format('YYYY-MM-DD');

        return (
          <DatePicker
            defaultValue={formattedValue}
            name={name}
            onChange={datePickerOnChange}
          />
        );
      }}
    />
  );
}

ControlledDatePicker.propTypes = {
  fieldName: PropTypes.string.isRequired,
};
