import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { allRegionsUserHasPermissionTo } from '../permissions'
import { buildDefaultRegionFilters } from '../pages/regionHelpers'

const ADMIN_REGION = 14

export default function useUserDefaultRegionFilters(user, manageRegions) {
  const regions = allRegionsUserHasPermissionTo(user)
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions])

  const defaultRegion = user.homeRegionId || regions[0] || 0
  const hasMultipleRegions = regions && regions.length > 1

  let defaultFilters = () => []
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
        : allRegionsFilters
  }

  return {
    regions,
    defaultRegion,
    hasMultipleRegions,
    allRegionsFilters,
    defaultFilters: defaultFilters(),
  }
}
