import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const PROGRAM_TYPE_OPTIONS = ['EHS', 'HS', 'EHS-CCP'].map((label, value) => ({ value, label }));

export default function FilterProgramType({
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
      labelText="Select program type to filter by"
      options={PROGRAM_TYPE_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterProgramType.propTypes = filterSelectProps;
