import React from 'react';
import PropTypes from 'prop-types';
import { TextInput } from '@trussworks/react-uswds';

export default function URLInput({
  onChange, onBlur, id, value, disabled,
}) {
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
      pattern=".*\.*.\..*"
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
