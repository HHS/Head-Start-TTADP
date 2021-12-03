import React from 'react';
import PropTypes from 'prop-types';

export default function FilterInput({ query, onApply }) {
  const onChange = (e) => {
    const { value } = e.target;
    onApply(value);
  };

  return (
    <input type="text" value={query} onChange={onChange} />
  );
}

FilterInput.propTypes = {
  query: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
