import { filterAssociation } from './utils';
import { uniq } from 'lodash';

const baseSql = `
  SELECT DISTINCT "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  INNER JOIN "ActivityReports"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE ARRAY_TO_STRING("ActivityReports"."ttaType", ',')
`;

const VALID_TTA_TYPES = [
  'technical-assistance',
  'training',
  'training,technical-assistance',
];

const calculateTtaType = (query) => [uniq(query.filter((ttaType) => VALID_TTA_TYPES.includes(ttaType))).join(',')];

export function withTtaType(query) {
  const ttaTypes = calculateTtaType(query);

  if (!ttaTypes.length) {
    return {};
  }

  return filterAssociation(baseSql, ttaTypes, false, "ILIKE");
}

export function withoutTtaType(query) {
  const ttaTypes = calculateTtaType(query);

  if (!ttaTypes.length) {
    return {};
  }

  return filterAssociation(baseSql, ttaTypes, false, "NOT ILIKE");
}