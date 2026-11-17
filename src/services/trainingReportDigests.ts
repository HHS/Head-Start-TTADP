import { Op } from 'sequelize';
import db from '../models';
import { REGIONAL_PD_WITH_NATIONAL_CENTERS } from './eventFlow';

const { EventReportPilot, sequelize } = db;

export interface TrainingReportDigestRow {
  id: number;
  displayId: string;
}

/**
 * Validates a user id that is interpolated into a raw audit-log subquery.
 * @returns the id as an integer, or null when it is not one.
 */
const toUserId = (userId: number | string): number | null => {
  const id = Number(userId);
  return Number.isInteger(id) ? id : null;
};

/**
 * An array column from an audit row. Inserts store the array itself; updates store only the
 * changed columns, each JSON-encoded as a string. A missing column reads as an empty array.
 */
const auditArray = (rowData: 'old_row_data' | 'new_row_data', column: string) => `
  CASE jsonb_typeof(${rowData}->'${column}')
    WHEN 'array' THEN ${rowData}->'${column}'
    WHEN 'string' THEN (${rowData}->>'${column}')::jsonb
    ELSE '[]'::jsonb
  END`;

/**
 * Event ids whose `column` (an integer array) gained `userId` within the interval, per the
 * EventReportPilots audit log. An insert has no old row, so a user on a new report counts.
 * @param column The integer array column, e.g. `pocIds`.
 * @param userId A validated integer user id.
 * @param date A trusted interval expression from `frequencyToInterval`, e.g. NOW() - INTERVAL '1 DAY'.
 */
const eventsWhereUserAddedSince = (
  column: 'pocIds' | 'collaboratorIds',
  userId: number,
  date: string
) =>
  sequelize.literal(`(
    SELECT data_id
    FROM "ZALEventReportPilots"
    WHERE dml_timestamp > ${date}
      AND ${auditArray('new_row_data', column)} @> '${userId}'::jsonb
      AND NOT ${auditArray('old_row_data', column)} @> '${userId}'::jsonb
  )`);

/**
 * Training Reports the user was added to as a Regional point of contact within the interval
 * (TR-19). Like TR-1a/b, only Regional PD events with National Centers count, the owner is
 * skipped, and the user must still be a POC.
 * @param userId The POC's user id.
 * @param date A trusted interval expression from `frequencyToInterval`.
 */
export async function trainingReportsWherePocByDate(
  userId: number | string,
  date: string
): Promise<TrainingReportDigestRow[]> {
  const id = toUserId(userId);
  if (id === null) {
    return [];
  }

  return EventReportPilot.findAll({
    attributes: ['id', ['eventId', 'displayId']],
    where: {
      pocIds: { [Op.contains]: [id] },
      ownerId: { [Op.ne]: id },
      data: { eventOrganizer: REGIONAL_PD_WITH_NATIONAL_CENTERS },
      id: { [Op.in]: eventsWhereUserAddedSince('pocIds', id, date) },
    },
    order: [['id', 'ASC']],
    raw: true,
  });
}
