import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

export default function FilterOptionSelect({
  onApply,
  labelText,
  options,
}) {
  const onChange = (selected) => {
    onApply(selected.map((selection) => selection.label));
  };

  return (
    <Select
      label={labelText}
      onChange={onChange}
      options={options}
      isMulti
    />
  );
}

FilterOptionSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
