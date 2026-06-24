import { Op } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Filters SessionReportPilot rows to only those that include at least one
 * grant belonging to the specified recipient. Grant IDs are stored in the
 * JSONB field data->'recipients'[].value (either as a JSON number or a
 * numeric string), so we join via jsonb_array_elements to the Grants table
 * and filter by recipientId.
 *
 * Per AGENTS.md ("Traps to Avoid → SQL injection in filters"), the input is
 * independently validated as a positive integer before interpolation.
 */
export function withRecipientId(recipientIds: string[]) {
  const recipientId = Number(recipientIds[0]);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return {};
  }

  return {
    [Op.and]: [
      sequelize.literal(`EXISTS (
        SELECT 1
        FROM jsonb_array_elements("SessionReportPilot"."data"->'recipients') AS elem
        INNER JOIN "Grants" g ON (
          CASE
            WHEN jsonb_typeof(elem->'value') = 'number'
                 OR (jsonb_typeof(elem->'value') = 'string' AND elem->>'value' ~ '^[0-9]+$')
            THEN (elem->>'value')::integer
            ELSE NULL
          END
        ) = g."id"
        WHERE g."recipientId" = ${sequelize.escape(recipientId)}
      )`),
    ],
  };
}
