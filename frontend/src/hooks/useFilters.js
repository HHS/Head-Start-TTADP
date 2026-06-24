import { useCallback, useContext, useMemo } from 'react';
import AriaLiveContext from '../AriaLiveContext';
import { NOOP } from '../Constants';
import useSessionFiltersAndReflectInUrl from './useSessionFiltersAndReflectInUrl';
import useUserDefaultRegionFilters from './useUserDefaultRegionFilters';

export default function useFilters(
  user,
  filterKey,
  manageRegions = false,
  additionalDefaultFilters = [],
  filterConfig = [],
  // Optional side-effect invoked whenever the filter set changes via any of the
  // exits this hook returns (setFilters, onApplyFilters, onRemoveFilter).
  // Pages whose paginated tables hold their own offset state can pass
  // `() => setResetPagination(true)` here to keep table pagination in sync
  // with filter mutations. See TTAHUB-5283.
  onFiltersChange = NOOP,
) {
  const ariaLiveContext = useContext(AriaLiveContext);

  const { regions, defaultRegion, hasMultipleRegions, allRegionsFilters, defaultFilters } =
    useUserDefaultRegionFilters(user, manageRegions);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(filterKey, [
    ...defaultFilters,
    ...additionalDefaultFilters,
  ]);

  // Wrap setFilters so every filter mutation - whether driven by the
  // FilterPanel, by a region-permission modal, or by some other consumer -
  // fires the optional onFiltersChange callback. onApplyFilters and
  // onRemoveFilter delegate to setFilters and inherit the side effect.
  const setFilters = useCallback(
    (newFilters) => {
      onFiltersChange();
      setFiltersInHook(newFilters);
    },
    [onFiltersChange, setFiltersInHook]
  );

  // Apply filters.
  const onApplyFilters = useCallback(
    (newFilters, addBackDefaultRegions) => {
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFilters([...allRegionsFilters, ...newFilters]);
      } else {
        setFilters([...newFilters]);
      }

      ariaLiveContext.announce(
        `${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`
      );
    },
    [allRegionsFilters, ariaLiveContext, setFilters]
  );

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

  const filtersToUse = useMemo(() => {
    let config = [...filterConfig];

    if (userHasOnlyOneRegion) {
      config = config.filter((f) => f.id !== 'region');
    }

    config.sort((a, b) => a.display.localeCompare(b.display));

    return config;
  }, [filterConfig, userHasOnlyOneRegion]);

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

    filterConfig: filtersToUse,
  };
}
