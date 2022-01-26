import React from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';

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
  applyButtonAria: PropTypes.string.isRequired,
  filterConfig: PropTypes.arrayOf(filterConfigProp).isRequired,
};
