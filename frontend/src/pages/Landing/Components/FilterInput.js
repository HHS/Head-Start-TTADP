import React from 'react';
import PropTypes from 'prop-types';

function FilterInput({ term, onChange }) {
  return (
    <input
      className="smart-hub--filter-input smart-hub--filter-input-box"
      name="query"
      value={term}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
  );
}

FilterInput.propTypes = {
  onChange: PropTypes.func.isRequired,
  term: PropTypes.string,
};

FilterInput.defaultProps = {
  term: '',
};

export default FilterInput;
