import filterArray, { filterAssociation } from './utils';
import { TARGET_POPULATIONS } from '../../constants';

const baseQuery = `
  SELECT DISTINCT "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  INNER JOIN "ActivityReports"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE ARRAY_TO_STRING("ActivityReports"."targetPopulations", ',')
`;

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
  let populations = allowedPopulations(targetPopulations);

  if (populations.length < 1) {
    return {};
  }

  populations = populations.map((population) => `%${population}%`);

  return filterAssociation(baseQuery, populations, false, 'ILIKE');
}

export function withoutTargetPopulations(targetPopulations) {
  let populations = allowedPopulations(targetPopulations);

  if (populations.length < 1) {
    return {};
  }

  populations = populations.map((population) => `%${population}%`);

  return filterAssociation(baseQuery, populations, false, 'NOT ILIKE');
}
