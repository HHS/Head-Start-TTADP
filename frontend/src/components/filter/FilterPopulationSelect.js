import React from 'react';
import PropTypes from 'prop-types';
import FilterOptionSelect from './FilterOptionSelect';
import { TARGET_POPULATIONS } from '../../Constants';

const POPULATION_OPTIONS = TARGET_POPULATIONS.filter((population) => population !== '--------------------').map((label, value) => ({ value, label }));

const PREGNANT_WOMEN_OPTION = POPULATION_OPTIONS[2];
// add border to the bottom of this option
Object.assign(PREGNANT_WOMEN_OPTION, { endGroup: true });

export default function FilterPopulationSelect({
  onApply,
  labelId,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterOptionSelect
      onApply={onApplyClick}
      labelId={labelId}
      labelText="Filter by target populations"
      ariaName="Change filter by target populations menu"
      options={POPULATION_OPTIONS}
    />
  );
}

FilterPopulationSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
