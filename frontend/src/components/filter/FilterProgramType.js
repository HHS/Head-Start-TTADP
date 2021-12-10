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
      labelText="Filter by program type"
      ariaName="Change filter by program type menu"
      options={PROGRAM_TYPE_OPTIONS}
    />
  );
}

FilterProgramType.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
