import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './IndeterminateCheckbox.css';

function Checkbox({
  id, name, label, checked, indeterminate, disabled, onChange,
}) {
  const indeterminateRef = useRef();
  useEffect(() => {
    indeterminateRef.current.indeterminate = indeterminate;
  });

  const onLocalChange = (e) => {
    onChange(e, indeterminate);
  };

  return (
    <>
      <input
        disabled={disabled}
        className="usa-checkbox__input"
        id={id}
        type="checkbox"
        name={name}
        onChange={onLocalChange}
        checked={checked}
        ref={indeterminateRef}
      />
      <label className="usa-checkbox__label" htmlFor={id}>
        {label}
      </label>
    </>
  );
}

Checkbox.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  checked: PropTypes.bool.isRequired,
  indeterminate: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

Checkbox.defaultProps = {
  indeterminate: false,
  disabled: false,
};

export default Checkbox;
