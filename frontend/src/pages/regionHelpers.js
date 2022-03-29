/* eslint-disable import/prefer-default-export */
import { v4 as uuidv4 } from 'uuid';

export function buildDefaultRegionFilters(regions) {
  const allRegionFilters = [];
  for (let i = 0; i < regions.length; i += 1) {
    allRegionFilters.push({
      id: uuidv4(),
      topic: 'region',
      condition: 'is',
      query: regions[i],
    });
  }
  return allRegionFilters;
}

export function showFilterWithMyRegions(allRegionsFilters, filters, setFilters) {
  // Exclude region filters we dont't have access to and show.
  const accessRegions = [...new Set(allRegionsFilters.map((r) => r.query))];
  const newFilters = filters.filter((f) => f.topic !== 'region' || (f.topic === 'region' && accessRegions.includes(parseInt(f.query[0], 10))));
  setFilters(newFilters);
}
