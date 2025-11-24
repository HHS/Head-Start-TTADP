import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';
import useSubFilters from '../../hooks/useSubFilters';
import { MyGroupsContext } from '../MyGroupsProvider';

const REGION = 'region';
const GROUP = 'group';

const determineRegionalFilters = (filters, allUserRegions, isLoadingGroups) => {
  // Expand ONLY region filters so each region gets its own pill
  // Other filters remain as-is with their array values
  const expandedFilters = filters.flatMap((filter) => {
    if (filter.topic === REGION && Array.isArray(filter.query)) {
      // Expand region filters into separate filter objects
      return filter.query.map((q) => ({
        id: `${filter.id}-${q}`,
        originalFilterId: filter.id,
        topic: filter.topic,
        condition: filter.condition,
        query: q,
      }));
    }
    // Keep all other filters unchanged
    return filter;
  });

  // Extract all region values from the expanded filters
  const passedRegionFilters = expandedFilters
    .filter((f) => f.topic === REGION)
    .map((r) => parseInt(r.query, 10));

  // If all user regions are present, hide region filters entirely
  const containsAllRegions = allUserRegions.every(
    (region) => passedRegionFilters.includes(region),
  );
  let filtersToShow = containsAllRegions
    ? expandedFilters.filter((f) => f.topic !== REGION)
    : expandedFilters;

  // Hide group filters while groups are loading
  if (isLoadingGroups) {
    filtersToShow = filtersToShow.filter((f) => f.topic !== GROUP);
  }

  return filtersToShow;
};

export default function FilterPanel({
  onRemoveFilter,
  filters,
  filterConfig,
  onApplyFilters,
  applyButtonAria,
  allUserRegions,
  manageRegions,
  allowedSubfilters,
}) {
  const { isLoading: isLoadingGroups } = useContext(MyGroupsContext);
  // eslint-disable-next-line max-len
  const [filtersToShow, setFiltersToShow] = useState(determineRegionalFilters(filters, allUserRegions, isLoadingGroups));
  const {
    subFilters,
    filteredFilterConfig,
  } = useSubFilters(filtersToShow, filterConfig, allowedSubfilters);

  useEffect(() => {
    // Hide or Show Region Filters, and hide Group filters while loading.
    setFiltersToShow(determineRegionalFilters(filters, allUserRegions, isLoadingGroups));
  }, [filters, allUserRegions, isLoadingGroups]);

  const onApply = (items) => {
    // Check for region filters.
    const regionFilters = items.filter((f) => f.topic === 'region');
    onApplyFilters(items, (regionFilters.length === 0 && manageRegions));
  };

  const onRemoveFilterPill = (id) => {
    // Find the pill in the expanded filters
    const expandedPill = filtersToShow.find((f) => f.id === id);

    if (!expandedPill) {
      return;
    }

    // Check if this is an expanded filter (has originalFilterId)
    const originalFilterId = expandedPill.originalFilterId || id;

    // Find the original filter
    const originalFilter = filters.find((f) => f.id === originalFilterId);

    if (!originalFilter) {
      return;
    }

    const isRegionFilter = originalFilter.topic === 'region';

    // If this was an expanded filter, we need to handle removing a single value
    if (expandedPill.originalFilterId) {
      // This is an expanded filter - remove just this value from the array
      if (Array.isArray(originalFilter.query)) {
        const updatedQuery = originalFilter.query.filter((q) => q !== expandedPill.query);

        if (updatedQuery.length === 0) {
          // Last value - remove the entire filter
          const otherRegions = isRegionFilter
            ? filters.filter((f) => f.id !== originalFilterId && f.topic === 'region')
            : [];
          onRemoveFilter(originalFilterId, isRegionFilter && otherRegions.length === 0);
        } else {
          // Still have values - update the filter with remaining values
          const updatedFilter = { ...originalFilter, query: updatedQuery };
          const updatedFilters = filters.map((f) => (
            f.id === originalFilterId ? updatedFilter : f
          ));
          onApplyFilters(updatedFilters, false);
        }
      }
    } else if (isRegionFilter) {
      // Not an expanded filter - remove the entire filter
      const otherRegions = filters.filter((f) => f.id !== id && f.topic === 'region');
      onRemoveFilter(id, otherRegions.length === 0);
    } else {
      onRemoveFilter(id, false);
    }
  };

  return (
    <>
      <FilterMenu
        filters={subFilters}
        onApplyFilters={onApply}
        applyButtonAria={applyButtonAria}
        filterConfig={filteredFilterConfig}
      />
      <FilterPills
        filterConfig={filteredFilterConfig}
        filters={subFilters}
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
  manageRegions: PropTypes.bool,
  allowedSubfilters: PropTypes.arrayOf(PropTypes.string),
};

FilterPanel.defaultProps = {
  manageRegions: true,
  allowedSubfilters: [],
};
