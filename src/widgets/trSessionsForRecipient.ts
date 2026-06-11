import { Op } from 'sequelize';
import db from '../models';
import { validatedIdArray } from '../scopes/utils';
import { baseTRScopes, formatNumber } from './helpers';
import type { IScopes } from './types';

const { EventReportPilot: TrainingReport, Grant, sequelize } = db;

interface ITrainingReportForSessionCount {
  sessionReports: { id: number }[];
}

/**
 * Widget: count of approved (COMPLETE) Training Report sessions for a given recipient.
 * Used on the RTR TTA History tab.
 *
 * NOTE: The `numSessions` key returned here is per-recipient and is distinct from the
 * `numSessions` returned by `trOverview`, which is a global count across visible TRs.
 */
export default async function trSessionsForRecipient(
  scopes: IScopes,
  query: Record<string, unknown>
): Promise<{ numSessions: string }> {
  const recipientIdsRaw = query['recipientId.ctn'];
  const rawList = Array.isArray(recipientIdsRaw)
    ? recipientIdsRaw
    : recipientIdsRaw != null ? [recipientIdsRaw] : [];
  const recipientIds = validatedIdArray(rawList.map((v) => String(v)));

  if (!recipientIds.length) {
    return { numSessions: '0' };
  }

  // Find all grants belonging to this recipient, respecting any active grant scopes
  // (e.g. region) so we don't include grants the user isn't entitled to see.
  const grants = (await Grant.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        { recipientId: { [Op.in]: recipientIds } },
        scopes.grant.where,
      ],
    },
    raw: true,
  })) as { id: number }[];

  const recipientGrantIds = new Set(grants.map((g) => g.id));

  if (!recipientGrantIds.size) {
    return { numSessions: '0' };
  }

  // Build a SQL literal that restricts sessions to only those containing at least
  // one of the recipient's grant IDs in the JSONB data.recipients array, pushing
  // the filter into SQL rather than scanning all sessions in JS.
  const grantIdList = [...recipientGrantIds].join(', ');
  const recipientGrantFilter = sequelize.literal(`EXISTS (
    SELECT 1
    FROM jsonb_array_elements("sessionReports"."data"->'recipients') elem
    WHERE (elem->>'value')::integer IN (${grantIdList})
  )`);

  const baseScopes = baseTRScopes(scopes);
  const reports = (await TrainingReport.findAll({
    attributes: ['id'],
    ...baseScopes,
    include: {
      ...baseScopes.include,
      attributes: ['id'],
      where: {
        ...baseScopes.include.where,
        [Op.and]: [recipientGrantFilter],
      },
    },
  })) as ITrainingReportForSessionCount[];

  // Each session in the result already matches a recipient grant, so count them all.
  const numSessions = reports.reduce((sum, r) => sum + r.sessionReports.length, 0);

  return { numSessions: formatNumber(numSessions) };
}
