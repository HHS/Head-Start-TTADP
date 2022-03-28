import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';

export default function FilterPanel({
  onRemoveFilter,
  filters,
  filterConfig,
  onApplyFilters,
  applyButtonAria,
  allUserRegions,
}) {
  const [filtersToShow, setFiltersToShow] = useState([]);

  useEffect(() => {
    // Determine if filters contain all regions.
    const passedRegionFilters = filters.filter((f) => f.topic === 'region').map((r) => r.query);
    let containsAllRegions = true;
    if (allUserRegions) {
      allUserRegions.forEach((r) => {
        if (!passedRegionFilters.includes(r)) {
          containsAllRegions = false;
        }
      });
    }
    // Hide or Show Region Filters.
    setFiltersToShow(containsAllRegions ? filters.filter((f) => f.topic !== 'region') : filters);
  }, [filters, allUserRegions]);

  const onApply = (items) => {
    // Check for region filters.
    const regionFilters = items.filter((f) => f.topic === 'region');
    onApplyFilters(items, regionFilters.length === 0);
  };

  const onRemoveFilterPill = (id) => {
    // Check if pill being removed is a region filter.
    const pillToRemove = filters.find((f) => f.id === id);
    const isRegionFilter = pillToRemove && pillToRemove.topic === 'region';

    if (isRegionFilter) {
      // Check if we removed the last region filter.
      const otherRegions = filters.filter((f) => f.id !== id && f.topic === 'region');
      onRemoveFilter(id, otherRegions.length === 0);
    } else {
      onRemoveFilter(id, false);
    }
  };

  return (
    <>
      <FilterMenu
        filters={filtersToShow}
        onApplyFilters={onApply}
        applyButtonAria={applyButtonAria}
        filterConfig={filterConfig}
      />
      <FilterPills
        filterConfig={filterConfig}
        filters={filtersToShow}
        onRemoveFilter={onRemoveFilterPill}
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
  allUserRegions: PropTypes.arrayOf(PropTypes.number).isRequired,
};
