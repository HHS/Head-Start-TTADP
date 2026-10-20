import { Op } from 'sequelize';
import db from '../models';
import { baseTRScopes, formatNumber } from './helpers';
import type { IScopes } from './types';

const { EventReportPilot: TrainingReport, Grant, sequelize } = db;

interface ISessionDataForRecipient {
  deliveryMethod?: string;
  duration?: number | string;
  numberOfParticipants?: number | string;
  numberOfParticipantsInPerson?: number | string;
  numberOfParticipantsVirtually?: number | string;
}

interface ITrainingReportForSessionCount {
  sessionReports: { id: number; data: ISessionDataForRecipient }[];
}

/**
 * Mirror of the per-session participant tallying in `trOverview.ts` so that the
 * "Participants" widget on the RTR TTA History tab sums TR session participants
 * the same way the global TR overview does.
 */
function getSessionParticipantCount(data: ISessionDataForRecipient): number {
  const {
    deliveryMethod,
    numberOfParticipants,
    numberOfParticipantsInPerson,
    numberOfParticipantsVirtually,
  } = data || {};

  if (deliveryMethod === 'hybrid') {
    return (Number(numberOfParticipantsInPerson) || 0)
      + (Number(numberOfParticipantsVirtually) || 0);
  }

  return Number(numberOfParticipants) || 0;
}

/**
 * Widget: count of approved (COMPLETE) Training Report sessions for a given recipient,
 * plus the total hours of TTA delivered, the total number of participants,
 * and the count of in-person sessions across those sessions.
 * Used on the RTR TTA History tab.
 *
 * The recipient filter flows in via scopes.grant.where (from the recipientId.ctn
 * URL param processed by grantsFiltersToScopes), matching how all other overview
 * widgets are scoped.
 *
 * NOTE: The `numSessions` key returned here is per-recipient and is distinct from the
 * `numSessions` returned by `trOverview`, which is a global count across visible TRs.
 * `sumDuration`, `numParticipants`, and `numInPerson` are returned as raw numbers so
 * they can be summed with the AR values in `ttaHistoryOverview`; formatting happens
 * in the caller.
 *
 * `numInPerson` matches the activity report overview's strict equality check on the
 * 'in-person' delivery method (see `src/widgets/overview.js`); hybrid sessions are
 * intentionally excluded so the combined "In person activities" widget stays
 * consistent with the AR-only behavior.
 */
export default async function trSessionsForRecipient(
  scopes: IScopes
): Promise<{
  numSessions: string;
  sumDuration: number;
  numParticipants: number;
  numInPerson: number;
}> {
  // Find all grants visible to this user/recipient via the standard grant scopes.
  const grants = (await Grant.findAll({
    attributes: ['id'],
    where: scopes.grant.where,
    raw: true,
  })) as { id: number }[];

  // Independently validate that every grant id is a positive integer before
  // interpolating into the SQL literal below. Per AGENTS.md ("Traps to Avoid →
  // SQL injection in filters"), `sequelize.escape` is insufficient — types
  // must be re-checked at the SQL boundary even when the upstream source
  // (here, Grant.findAll) is expected to return integers.
  const grantIdList = [...new Set(grants.map((g) => g.id))]
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (grantIdList.length === 0) {
    return {
      numSessions: '0', sumDuration: 0, numParticipants: 0, numInPerson: 0,
    };
  }

  // Build a SQL literal that restricts sessions to only those containing at least
  // one of the recipient's grant IDs in the JSONB data.recipients array, pushing
  // the filter into SQL rather than scanning all sessions in JS.
  //
  // Guard the ::integer cast against malformed session data: a single recipient
  // entry whose `value` is null, an object, or a non-numeric string would
  // otherwise raise "invalid input syntax for type integer" and fail the
  // entire widget for everyone in scope. We accept either a JSONB number or
  // a JSONB string of digits, and skip everything else.
  const recipientGrantFilter = sequelize.literal(`EXISTS (
    SELECT 1
    FROM jsonb_array_elements("sessionReports"."data"->'recipients') elem
    WHERE (
      jsonb_typeof(elem->'value') = 'number'
      OR (jsonb_typeof(elem->'value') = 'string' AND elem->>'value' ~ '^[0-9]+$')
    )
    AND (elem->>'value')::integer IN (${grantIdList.join(', ')})
  )`);

  const baseScopes = baseTRScopes(scopes);
  const reports = (await TrainingReport.findAll({
    attributes: ['id'],
    ...baseScopes,
    include: {
      ...baseScopes.include,
      attributes: ['id', 'data'],
      where: {
        ...baseScopes.include.where,
        [Op.and]: [recipientGrantFilter],
      },
    },
  })) as ITrainingReportForSessionCount[];

  // Each session in the result already matches a recipient grant, so count them all.
  const numSessions = reports.reduce((sum, r) => sum + r.sessionReports.length, 0);

  // Sum the duration across every matching session. Sessions store duration as a
  // number in JSONB, but we parseFloat defensively to match the activity report
  // overview's handling of legacy/string-typed durations.
  const sumDuration = reports.reduce(
    (sum, r) => sum + r.sessionReports.reduce(
      (sessionSum, s) => sessionSum + (parseFloat(s.data?.duration as string) || 0),
      0,
    ),
    0,
  );

  // Sum participants across every matching session using the same per-delivery-method
  // logic as `trOverview`, so the combined widget value stays consistent with the
  // global TR overview.
  const numParticipants = reports.reduce(
    (sum, r) => sum + r.sessionReports.reduce(
      (sessionSum, s) => sessionSum + getSessionParticipantCount(s.data),
      0,
    ),
    0,
  );

  // Count sessions whose delivery method is strictly 'in-person', mirroring the
  // AR overview's equality check so the combined "In person activities" widget
  // counts AR and TR sessions the same way.
  const numInPerson = reports.reduce(
    (sum, r) => sum + r.sessionReports.filter(
      (s) => (s.data?.deliveryMethod || '').toLowerCase() === 'in-person',
    ).length,
    0,
  );

  return {
    numSessions: formatNumber(numSessions), sumDuration, numParticipants, numInPerson,
  };
}
