import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';

export default function FilterPanel({
  filters,
  onApplyFilters,
  onRemoveFilter,
  applyButtonAria,
  filterConfig,
}) {
  const [filtersToUse, setFiltersToUse] = useState(filters);
  useEffect(() => {
    // If filter config doesn't contain regions dont display region filters.
    const regionFilters = filters.find((f) => f.topic === 'region');
    const regionConfig = filterConfig.find((c) => c.id === 'region');
    if (regionFilters && !regionConfig) {
      const filtersWithoutRegion = filters.filter((f) => f.topic !== 'region');
      setFiltersToUse(filtersWithoutRegion);
    } else {
      setFiltersToUse(filters);
    }
  }, [filters, filterConfig]);

  return (
    <>
      <FilterMenu
        filters={filtersToUse}
        onApplyFilters={onApplyFilters}
        applyButtonAria={applyButtonAria}
        filterConfig={filterConfig}
      />
      <FilterPills
        filterConfig={filterConfig}
        filters={filtersToUse}
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
