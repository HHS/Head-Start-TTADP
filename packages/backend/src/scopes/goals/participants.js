import { ALL_PARTICIPANTS } from '@ttahub/common';
import filterArray, { filterAssociation } from './utils';

export function onlyValidParticipants(query) {
  if (!Array.isArray(query)) {
    return [query].filter((participant) => ALL_PARTICIPANTS.includes(participant));
  }

  return query.filter((participant) => ALL_PARTICIPANTS.includes(participant));
}

const baseQuery = `
  SELECT DISTINCT "ActivityReportGoals"."goalId"
  FROM "ActivityReportGoals"
  INNER JOIN "ActivityReports"
  ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
  WHERE ARRAY_TO_STRING("ActivityReports"."participants", ',')
`;

export function withParticipants(query) {
  let participants = onlyValidParticipants(query);

  if (!participants.length) {
    return {};
  }

  participants = participants.map((participant) => `%${participant}%`);

  return filterAssociation(baseQuery, participants, false, 'ILIKE');
}

export function withoutParticipants(query) {
  let participants = onlyValidParticipants(query);

  if (!participants.length) {
    return {};
  }

  participants = participants.map((participant) => `%${participant}%`);

  return filterAssociation(baseQuery, participants, false, 'NOT ILIKE');
}
