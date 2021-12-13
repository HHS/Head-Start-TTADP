import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';

const PROGRAM_TYPE_OPTIONS = ['EHS', 'HS', 'EHS-CCP'].map((label, value) => ({ value, label }));

export default function FilterProgramType({
  onApply,
  labelId,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      labelId={labelId}
      labelText="Select program type to filter by"
      options={PROGRAM_TYPE_OPTIONS}
    />
  );
}

FilterProgramType.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
