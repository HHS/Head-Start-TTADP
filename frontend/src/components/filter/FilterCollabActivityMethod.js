import React from 'react';
import { COLLAB_REPORT_CONDUCT_METHODS } from '../../Constants';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterCollabActivityMethod({ onApply, inputId, query }) {
  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select activity method to filter by"
      options={COLLAB_REPORT_CONDUCT_METHODS}
      selectedValues={query}
      mapByValue
    />
  );
}

FilterCollabActivityMethod.propTypes = filterSelectProps;
