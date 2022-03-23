import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';

export default function FilterPanel({
  onRemoveFilter,
  filters,
  filterConfig,
  hideRegionFiltersByDefault,
  onApplyFilters,
  applyButtonAria,
}) {
  // Prop 'hideRegionFiltersByDefault' is used to set the
  // initial hide/show region filter state based on the User's settings.
  const [hideRegionFilters, setHideRegionFilters] = useState(hideRegionFiltersByDefault);
  const [filtersToShow, setFiltersToShow] = useState([]);

  useEffect(() => {
    // If we are hiding region filters prevent any underlying component from getting region filters.
    setFiltersToShow(hideRegionFilters ? filters.filter((f) => f.topic !== 'region') : filters);
  }, [hideRegionFilters, filters]);

  const onApply = (items) => {
    // Check for region filter.
    const regionFilter = items.find((f) => f.topic === 'region');
    onApplyFilters(items, !regionFilter);
    setHideRegionFilters(!regionFilter);
  };

  const onRemoveFilterPill = (id) => {
    // Check if pill being removed is a region filter.
    const pillToRemove = filters.find((f) => f.id === id);
    const isRegionFilter = pillToRemove && pillToRemove.topic === 'region';

    if (isRegionFilter) {
      const otherRegion = filters.find((f) => f.id !== id && f.topic === 'region');
      const haveRemainingRegions = !hideRegionFiltersByDefault && otherRegion;
      onRemoveFilter(id, !haveRemainingRegions);
      setHideRegionFilters(!haveRemainingRegions);
    } else {
      onRemoveFilter(id, false);
    }

    /*
       onRemoveFilter(id, isRegionFilter);
    if (isRegionFilter) {
      setHideRegionFilters(true);
    }
    */
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
  hideRegionFiltersByDefault: PropTypes.bool,
};

FilterPanel.defaultProps = {
  hideRegionFiltersByDefault: false,
};
