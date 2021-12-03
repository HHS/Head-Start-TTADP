import React from 'react';
import PropTypes from 'prop-types';
import CheckboxSelect from '../CheckboxSelect';

export default function FilterOptionSelect({
  onApply,
  labelId,
  labelText,
  ariaName,
  options,
}) {
  const onApplyClick = (selected) => {
    const values = selected.map((s) => parseInt(s, 10));

    const toApply = options.filter(
      (option) => values.includes(option.value),
    ).map((option) => option.label);

    onApply(toApply);
  };

  return (
    <CheckboxSelect
      styleAsSelect
      hideToggleAll
      toggleAllInitial={false}
      labelId={labelId}
      labelText={labelText}
      ariaName={ariaName}
      onApply={onApplyClick}
      options={options}
    />
  );
}

FilterOptionSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  labelText: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
