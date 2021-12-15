import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { DropdownMenuContext } from '../DropdownMenu';

export default function FilterInput({
  query,
  onApply,
  inputId,
  label,
}) {
  const { onKeyDown } = useContext(DropdownMenuContext);

  const onChange = (e) => {
    const { value } = e.target;
    onApply(value);
  };

  return (
    <>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <input className="usa-input" type="text" name={inputId} id={inputId} value={query} onChange={onChange} onKeyDown={onKeyDown} />
    </>
  );
}

FilterInput.propTypes = {
  query: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  inputId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};
