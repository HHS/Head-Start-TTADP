import filterArray from './utils';
import { TARGET_POPULATIONS } from '../../constants';

export function allowedPopulations(populations) {
  function filterPopulations(population) {
    return TARGET_POPULATIONS.includes(population);
  }

  if (!Array.isArray(populations)) {
    return [populations].filter((population) => filterPopulations(population));
  }

  return populations.filter((population) => filterPopulations(population));
}

export function withTargetPopulations(targetPopulations) {
  const populations = allowedPopulations(targetPopulations);
  if (populations.length < 1) {
    return {};
  }
  return filterArray('ARRAY_TO_STRING("ActivityReport"."targetPopulations", \',\')', populations, false);
}

export function withoutTargetPopulations(targetPopulations) {
  const populations = allowedPopulations(targetPopulations);
  if (populations.length < 1) {
    return {};
  }
  return filterArray('ARRAY_TO_STRING("ActivityReport"."targetPopulations", \',\')', populations, true);
}
