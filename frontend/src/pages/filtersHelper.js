/* eslint-disable import/prefer-default-export */
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { buildDefaultRegionFilters } from './regionHelpers';
import { getUserRegions } from '../permissions';
import { formatDateRange } from '../utils';
import useSessionFiltersAndReflectInUrl from '../hooks/useSessionFiltersAndReflectInUrl';

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

export default function useDefaultFilters(user, filterKey) {
  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const defaultRegion = useMemo(() => regions[0].toString(), [regions]);

  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  function getFiltersWithAllRegions() {
    const filtersWithAllRegions = [...allRegionsFilters];
    filtersWithAllRegions.push({
      id: uuidv4(),
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    });
    return filtersWithAllRegions;
  }

  const centralOfficeWithAllRegionFilters = getFiltersWithAllRegions();

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return centralOfficeWithAllRegionFilters;
    }

    return [
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      },
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ];
  }, [defaultRegion, hasCentralOffice, centralOfficeWithAllRegionFilters]);

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(filterKey, defaultFilters);

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters(newFilters);
    }
  };

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

  return {
    allRegionsFilters, regions, onApplyFilters, onRemoveFilter, filters, setFilters,
  };
}
