/* eslint-disable import/prefer-default-export */
import { filterAssociation } from './utils';

const eventIdSql = `
SELECT
 DISTINCT erp."id"
FROM "TrainingReports" erp
WHERE data->>'eventId'`;

export function withEventId(names) {
  return filterAssociation(eventIdSql, names, false, '~*');
}

export function withoutEventId(names) {
  return filterAssociation(eventIdSql, names, true, '~*');
}
