import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { buildDefaultRegionFilters } from '../pages/regionHelpers';
import { allRegionsUserHasPermissionTo } from '../permissions';

const ADMIN_REGION = 14;

export default function useUserDefaultRegionFilters(
  user,
  manageRegions,
  getUserRegions = allRegionsUserHasPermissionTo
) {
  const regions = getUserRegions(user);
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);

  // a custom resolver (e.g. TTA requests) can leave out the home region, so only default to it
  // when it is one of the resolved regions
  const homeRegionAllowed =
    getUserRegions === allRegionsUserHasPermissionTo || regions.includes(user.homeRegionId);
  const defaultRegion = (homeRegionAllowed && user.homeRegionId) || regions[0] || 0;
  const hasMultipleRegions = regions && regions.length > 1;

  let defaultFilters = () => [];
  if (manageRegions) {
    defaultFilters = () =>
      defaultRegion !== ADMIN_REGION && defaultRegion !== 0 && hasMultipleRegions
        ? [
            {
              id: uuidv4(),
              topic: 'region',
              condition: 'is',
              query: defaultRegion,
            },
          ]
        : allRegionsFilters;
  }

  return {
    regions,
    defaultRegion,
    hasMultipleRegions,
    allRegionsFilters,
    defaultFilters: defaultFilters(),
  };
}
