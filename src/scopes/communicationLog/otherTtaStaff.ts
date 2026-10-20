import { sequelize } from '../../models';

// Only allow positive integer user ids to reach the raw SQL literal. Filter values
// come from the URL, so we must independently validate the expected type before use.
const validNumericIds = (ids: string[]): number[] => [
  ...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
];

const staffExistsQuery = (ids: number[], exclude = false) =>
  sequelize.literal(`
  ${exclude ? 'NOT ' : ''}EXISTS (
    SELECT 1
    FROM "CommunicationLogStaff" AS cls
    WHERE cls."communicationLogId" = "CommunicationLog".id
      AND cls."userId" IN (${ids.join(',')})
  )
`);

export function withOtherTtaStaff(ids: string[]) {
  const validIds = validNumericIds(ids);
  if (validIds.length === 0) {
    return {};
  }
  return staffExistsQuery(validIds, false);
}

export function withoutOtherTtaStaff(ids: string[]) {
  const validIds = validNumericIds(ids);
  if (validIds.length === 0) {
    return {};
  }
  return staffExistsQuery(validIds, true);
}
