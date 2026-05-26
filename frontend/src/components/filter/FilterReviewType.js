import React from 'react';
import { getCitationReviewTypes } from '../../fetchers/deliveredReviews';
import useFetch from '../../hooks/useFetch';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterReviewType({ onApply, inputId, query }) {
  const { data } = useFetch(
    [],
    async () => {
      return getCitationReviewTypes();
    },
    [],
    'Error fetching review types'
  );

  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select review type to filter by"
      options={data.map((type) => ({ value: type, label: type }))}
      selectedValues={query}
    />
  );
}

FilterReviewType.propTypes = filterSelectProps;
