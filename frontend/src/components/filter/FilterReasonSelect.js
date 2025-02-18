import React from 'react';
import { REASONS } from '@ttahub/common';
import FilterSelect from './FilterSelect';
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
