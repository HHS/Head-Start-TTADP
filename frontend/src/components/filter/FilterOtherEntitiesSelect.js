import React from 'react';
import FilterSelect from './FilterSelect';
import { OTHER_ENTITY_TYPES } from '../../Constants';
import { filterSelectProps } from './props';

const OTHER_ENTITY_OPTIONS = OTHER_ENTITY_TYPES.map((label, value) => ({ value, label }));

export default function FilterOtherEntitiesSelect({
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
      labelText="Select other entities to filter by"
      options={OTHER_ENTITY_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterOtherEntitiesSelect.propTypes = filterSelectProps;
