import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { allRegionsUserHasPermissionTo } from '../permissions';
import { buildDefaultRegionFilters } from '../pages/regionHelpers';

const ADMIN_REGION = 14;

export default function useUserDefaultRegionFilters(user) {
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  const defaultFilters = useMemo(() => ((defaultRegion !== ADMIN_REGION
    && defaultRegion !== 0
    && hasMultipleRegions)
    ? [{
      id: uuidv4(),
      topic: 'region',
      condition: 'is',
      query: defaultRegion,
    }]
    : allRegionsFilters), [allRegionsFilters, defaultRegion, hasMultipleRegions]);

  return {
    regions,
    defaultRegion,
    hasMultipleRegions,
    allRegionsFilters,
    defaultFilters,
  };
}
