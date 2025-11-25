import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { isArray } from 'lodash';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { filterConfigProp, filterProp } from './props';
import useSubFilters from '../../hooks/useSubFilters';
import { MyGroupsContext } from '../MyGroupsProvider';

const REGION = 'region';
const GROUP = 'group';

const determineRegionalFilters = (filters, allUserRegions) => {
  const passedRegionFilters = filters.filter((f) => f.topic === REGION).map((r) => {
    if (isArray(r.query)) {
      return parseInt(r.query[0], 10);
    }
    return r.query;
  });

  const containsAllRegions = allUserRegions.every((region) => passedRegionFilters.includes(region));
  return containsAllRegions ? filters.filter((f) => f.topic !== REGION) : filters;
};

const determineFiltersToShow = (filters, allUserRegions, isLoadingGroups) => {
  // First apply regional filter logic
  let filtersToShow = determineRegionalFilters(filters, allUserRegions);

  // Then hide group filters while groups are loading
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
  const { isLoadingGroups = false } = useContext(MyGroupsContext);

  // eslint-disable-next-line max-len
  const [filtersToShow, setFiltersToShow] = useState(
    determineFiltersToShow(filters, allUserRegions, isLoadingGroups),
  );
  const {
    subFilters,
    filteredFilterConfig,
  } = useSubFilters(filtersToShow, filterConfig, allowedSubfilters);

  useEffect(() => {
    // Hide or Show Region and Group Filters based on loading state.
    setFiltersToShow(determineFiltersToShow(filters, allUserRegions, isLoadingGroups));
  }, [filters, allUserRegions, isLoadingGroups]);

  const onApply = (items) => {
    // Check for region filters.
    const regionFilters = items.filter((f) => f.topic === 'region');
    onApplyFilters(items, (regionFilters.length === 0 && manageRegions));
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
