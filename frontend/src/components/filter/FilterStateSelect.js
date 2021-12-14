import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';

export default function FilterStateSelect({
  onApply,
  inputId,
  stateCodes,
}) {
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
    />
  );
}

FilterStateSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  stateCodes: PropTypes.arrayOf(PropTypes.string).isRequired,
};
