import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { TARGET_POPULATIONS } from '../../Constants';

const POPULATION_OPTIONS = TARGET_POPULATIONS.filter((population) => population !== '--------------------').map((label, value) => ({ value, label }));

const PREGNANT_WOMEN_OPTION = POPULATION_OPTIONS[2];
// add border to the bottom of this option
Object.assign(PREGNANT_WOMEN_OPTION, { endGroup: true });

export default function FilterPopulationSelect({
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
      labelText="Select target populations to filter by"
      options={POPULATION_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterPopulationSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]).isRequired,
};
