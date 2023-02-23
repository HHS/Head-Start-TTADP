import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation } from './utils';

const baseQuery = `
  SELECT DISTINCT "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  WHERE "ActivityReportGoals"."activityReportId"`;

export function withReportIds(ids) {
  // ids is an array of strings like "R01-AR-0000123", "R01-AR-0000456", "R01-AR-0000789"
  // Strip the R\d\d-AR- prefix from each ID and convert to a number to remove leading 0s.
  ids = ids.map((id) => id.replace(/R\d\d-AR-/, '')).map(id => Number(id));

  // Convert this array of IDs to a string like "(123, 456, 789)"
  const parenthesizedIdString = `(${ids.join(', ')})`;

  return filterAssociation(baseQuery, [parenthesizedIdString], false, "IN", false);
}

export function withoutReportIds(ids) {
  ids = ids.map((id) => id.replace(/R\d\d-AR-/, '')).map(id => Number(id));
  const parenthesizedIdString = `(${ids.join(', ')})`;
  return filterAssociation(baseQuery, [parenthesizedIdString], false, "NOT IN", false);
}
