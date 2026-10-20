import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const FINDING_TYPE_OPTIONS = ['Area of Concern', 'Noncompliance', 'Deficiency'].map(
  (label, value) => ({ value, label })
);

export default function FilterFindingType({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select finding type to filter by"
      options={FINDING_TYPE_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterFindingType.propTypes = filterSelectProps;
