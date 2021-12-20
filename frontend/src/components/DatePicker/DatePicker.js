/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable import/prefer-default-export */
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import USWDS from '../../../node_modules/uswds/src/js/components';

const { datePicker } = USWDS;

export function DatePicker({ name }) {
  const control = useRef();

  useEffect(() => {
    // initialize (only once please)
    if (!control.current.classList.contains('usa-date-picker--initialized')) {
      datePicker.on();
    }

    // // this will suppress react-form related warnings for fields missing name
    // if (!control.current.querySelector('input').hasAttribute('name')) {
    //   control.current.querySelector('input').setAttribute('name', `${name}--internal`);
    // }
  });

  return (
    <div className="usa-date-picker" ref={control}>
      <input
        className="usa-input"
        id={name}
        name={name}
        type="text"
      />
    </div>
  );
}

DatePicker.propTypes = {
  name: PropTypes.string.isRequired,
};
