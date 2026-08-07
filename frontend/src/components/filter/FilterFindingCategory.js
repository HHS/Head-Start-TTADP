import React from 'react';
import { getFindingCategories } from '../../fetchers/monitoring';
import useFetch from '../../hooks/useFetch';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterFindingCategory({ onApply, inputId, query }) {
  const { data } = useFetch(
    [],
getFindingCategories,
    [],
    'Error fetching finding categories'
  );

  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select finding category to filter by"
      options={data.map((name) => ({ value: name, label: name }))}
      selectedValues={query}
    />
  );
}

FilterFindingCategory.propTypes = filterSelectProps;
