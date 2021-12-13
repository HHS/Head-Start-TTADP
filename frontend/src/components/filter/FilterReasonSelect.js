import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { REASONS } from '../../Constants';

const REASONS_OPTIONS = REASONS.map((label, value) => ({ value, label }));

export default function FilterReasonSelect({
  onApply,
  inputId,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select reasons to filter by"
      options={REASONS_OPTIONS}
    />
  );
}

FilterReasonSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
