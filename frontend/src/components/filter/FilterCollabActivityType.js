import React from 'react';
import { COLLAB_REPORT_ACTIVITY_TYPES } from '../../Constants';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterCollabActivityType({ onApply, inputId, query }) {
  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select activity type to filter by"
      options={COLLAB_REPORT_ACTIVITY_TYPES}
      selectedValues={query}
      mapByValue
    />
  );
}

FilterCollabActivityType.propTypes = filterSelectProps;
