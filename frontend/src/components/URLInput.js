import { TextInput } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';

export default function URLInput({ onChange, onBlur, id, value, disabled }) {
  return (
    <TextInput
      id={id}
      name={id}
      onBlur={onBlur}
      type="url"
      placeholder="https://"
      onChange={onChange}
      value={value}
      disabled={disabled}
    />
  );
}

URLInput.propTypes = {
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

URLInput.defaultProps = {
  disabled: false,
};
