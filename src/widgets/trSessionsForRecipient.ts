import { Op } from 'sequelize';
import db from '../models';
import { validatedIdArray } from '../scopes/utils';
import { baseTRScopes, formatNumber } from './helpers';
import type { IScopes } from './types';

const { EventReportPilot: TrainingReport, Grant } = db;

interface ISessionReport {
  data: {
    recipients: {
      value: number;
    }[];
  };
}

interface ITrainingReportForSessionCount {
  sessionReports: ISessionReport[];
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

  // Get completed training reports with their complete sessions via shared scope helper
  const reports = (await TrainingReport.findAll({
    attributes: ['id'],
    ...baseTRScopes(scopes),
  })) as ITrainingReportForSessionCount[];

  // Count sessions where the recipient has at least one matching grant in data.recipients
  let numSessions = 0;
  reports.forEach((report) => {
    report.sessionReports.forEach((session) => {
      const sessionGrantIds = (session.data.recipients || []).map((r) => r.value);
      if (sessionGrantIds.some((id) => recipientGrantIds.has(id))) {
        numSessions += 1;
      }
    });
  });

  return { numSessions: formatNumber(numSessions) };
}
