import React from 'react';
import FilterSelect from './FilterSelect';
import { REASONS } from '../../Constants';
import { filterSelectProps } from './props';

const REASONS_OPTIONS = REASONS.map((label, value) => ({ value, label }));

export default function FilterReasonSelect({
  onApply,
  inputId,
  query,
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
      selectedValues={query}
    />
  );
}

FilterReasonSelect.propTypes = filterSelectProps;
