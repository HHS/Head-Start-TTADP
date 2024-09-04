import { useCallback, useContext, useMemo } from 'react';
import useUserDefaultRegionFilters from './useUserDefaultRegionFilters';
import useSessionFiltersAndReflectInUrl from './useSessionFiltersAndReflectInUrl';
import AriaLiveContext from '../AriaLiveContext';

export default function useFilters(
  user,
  filterKey,
  manageRegions = false,
  additionalDefaultFilters = [],
) {
  const ariaLiveContext = useContext(AriaLiveContext);

  const {
    regions,
    defaultRegion,
    hasMultipleRegions,
    allRegionsFilters,
    defaultFilters,
  } = useUserDefaultRegionFilters(user, manageRegions);

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(
    filterKey,
    [...defaultFilters, ...additionalDefaultFilters],
  );

  // Apply filters.
  const onApplyFilters = useCallback((newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters([
        ...newFilters,
      ]);
    }

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`);
  }, [allRegionsFilters, ariaLiveContext, setFilters]);

  // Remove Filters.
  const onRemoveFilter = (id, addBackDefaultRegions) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFilters([...allRegionsFilters, ...newFilters]);
      } else {
        setFilters(newFilters);
      }
    }
  };

  const userHasOnlyOneRegion = useMemo(() => regions.length === 1, [regions]);

  return {
    // from useUserDefaultRegionFilters
    regions,
    userHasOnlyOneRegion,
    defaultRegion,
    hasMultipleRegions,
    allRegionsFilters,
    defaultFilters,

    // filter functionality
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
  };
}
