import React from 'react';
import PropTypes from 'prop-types';

export default function FilterInput({
  query,
  onApply,
  id,
  condition,
  label,
  type,
}) {
  const onChange = (e) => {
    const { value } = e.target;
    onApply(value);
  };

  const inputId = `${type}-${condition}-${id}`;

  return (
    <>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <input className="usa-input" type="text" name={inputId} id={inputId} value={query} onChange={onChange} />
    </>
  );
}

FilterInput.propTypes = {
  query: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  condition: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};
