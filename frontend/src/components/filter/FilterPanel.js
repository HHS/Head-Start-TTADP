import React from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterProp } from './props';
import { AVAILABLE_FILTERS } from './constants';

// The allowed filters prop that's passed into the filtermenu is representative of
// the "id" values of the FILTER_CONFIG object in constants
// for them to be used here, they have to be defined there
export default function FilterPanel(props) {
  const { onRemoveFilter, filters } = props;

  return (
    <>
      <FilterMenu
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
      <FilterPills
        filters={filters}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
}

FilterPanel.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  allowedFilters: PropTypes.arrayOf(PropTypes.string),
  applyButtonAria: PropTypes.string.isRequired,
};

FilterPanel.defaultProps = {
  allowedFilters: AVAILABLE_FILTERS,
};
