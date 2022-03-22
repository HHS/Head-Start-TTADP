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

  /* DEV NOTE:
     Right now we are using the filter panel to intercept any filter changes.
     If the default behavior is to hide region filters but display them in the URL,
     we intercept and handle these cases in 'onApply' and 'onRemoveFilter'.
     If we are NOT hiding region filters we do the same behavior as before.
     This code is being handled here for reusability in other filter locations.
  */
  const onApply = (items) => {
    if (hideRegionFiltersByDefault) {
      // If we are currently hiding the region filters.
      if (hideRegionFilters) {
        // Check if user added region filter.
        const regionFilters = items.find((f) => f.topic === 'region');
        if (!regionFilters) {
          // If user didn't add a region filter add existing region filters from url.
          onApplyFilters(items, true);
        } else {
          // User added a region filter.
          setHideRegionFilters(false);
          onApplyFilters(items, false);
        }
      } else {
        // We are not hiding the region filters.
        const regionFilter = items.find((f) => f.topic === 'region');
        onApplyFilters(items, !regionFilter);
        setHideRegionFilters(!regionFilter);
      }
    } else {
      // Handle apply normally.
      onApplyFilters(items, false);
    }
  };

  const onRemoveFilterPill = (id) => {
    if (hideRegionFiltersByDefault) {
      // Check if pill being removed is a region.
      const pillToRemove = filters.find((f) => f.id === id);
      const addBackAndHideDefaultRegions = pillToRemove && pillToRemove.topic === 'region';
      // Remove from parent add back default regions.
      onRemoveFilter(id, addBackAndHideDefaultRegions);
      if (addBackAndHideDefaultRegions && !hideRegionFilters) {
        setHideRegionFilters(true);
      }
    } else {
      // Handle onRemove normally.
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
  hideRegionFiltersByDefault: PropTypes.bool,
};

FilterPanel.defaultProps = {
  hideRegionFiltersByDefault: false,
};
