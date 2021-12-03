import React from 'react';
import PropTypes from 'prop-types';
import FilterOptionSelect from './FilterOptionSelect';
import { REASONS } from '../../Constants';

const REASONS_OPTIONS = REASONS.map((label, value) => ({ value, label }));

export default function FilterReasonSelect({
  onApply,
  labelId,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterOptionSelect
      onApply={onApplyClick}
      labelId={labelId}
      labelText="Filter by reasons"
      ariaName="Change filter by reasons menu"
      options={REASONS_OPTIONS}
    />
  );
}

FilterReasonSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
