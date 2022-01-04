import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { getStateCodes } from '../../fetchers/users';

export default function FilterStateSelect({
  onApply,
  inputId,
  query,
}) {
  const [stateCodes, setStateCodes] = useState([]);

  // fetch state codes for user
  useEffect(() => {
    async function fetchStateCodes() {
      try {
        const codes = await getStateCodes();
        setStateCodes(codes);
      } catch (error) {
        // fail silently
      }
    }

    fetchStateCodes();
  }, []);

  const options = stateCodes.filter((code) => code).map((label, value) => ({
    value, label,
  }));

  const onApplyClick = (selected) => {
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select state to filter by"
      options={options}
      selectedValues={query}
    />
  );
}

FilterStateSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]).isRequired,
};
