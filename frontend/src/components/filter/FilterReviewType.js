import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const REVIEW_TYPE_OPTIONS = [
  'FA2-CR',
  'CLASS AIAN Onsite',
  'Special',
  'AIAN CLASS Self-Observations',
  'CLASS',
  'FA-1',
  'CLASS AIAN Video',
  'CLASS-Video',
  'FA2-CSR',
  'FA1-PSR',
  'Follow-up',
  'RAN',
  'FA1-FR',
].map((label, value) => ({ value, label }));

export default function FilterReviewType({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select review type to filter by"
      options={REVIEW_TYPE_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterReviewType.propTypes = filterSelectProps;
