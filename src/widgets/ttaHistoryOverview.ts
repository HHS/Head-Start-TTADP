import overview from './overview';
import trSessionsForRecipient from './trSessionsForRecipient';
import { formatNumber } from './helpers';
import type { IScopes } from './types';

/**
 * Combined widget for the TTA History tab overview row.
 * Returns all standard Activity Report overview metrics plus the count of
 * approved Training Report sessions for the recipient, so both can be rendered
 * in a single in-order field row.
 *
 * `sumDuration` represents the total hours of TTA delivered to the recipient
 * across approved Activity Reports AND approved Training Report sessions
 * combined, so the "Hours of TTA" widget reflects both delivery channels.
 *
 * `numParticipants` represents the total participants on approved Activity
 * Reports AND approved Training Report sessions combined for the recipient,
 * so the "Participants" widget reflects both delivery channels.
 */
export default async function ttaHistoryOverview(
  scopes: IScopes,
  // Accepted to match the widget runner signature in
  // src/routes/widgets/handlers.js; not currently used by this widget.
  _query: Record<string, unknown>
): Promise<Record<string, string | number> & { numSessions: string }> {
  const [arData, trData] = await Promise.all([
    overview(scopes),
    trSessionsForRecipient(scopes),
  ]);

  // `overview` returns sumDuration formatted with toLocaleString (e.g. "1,234.5"),
  // so strip the thousands separators before parsing to combine with the raw
  // numeric TR duration.
  const arDuration = parseFloat((arData.sumDuration || '0').replace(/,/g, '')) || 0;
  const combinedSumDuration = formatNumber(arDuration + trData.sumDuration, 1);

  // overview() returns numParticipants as a locale-formatted string (e.g.
  // "1,234"). Strip the thousands separators before parsing so we can sum
  // it with the TR participant count and re-format the total.
  const arParticipants = parseInt((arData.numParticipants || '0').replace(/,/g, ''), 10) || 0;
  const combinedNumParticipants = formatNumber(
    arParticipants + trData.numParticipants
  );

  return {
    ...arData,
    sumDuration: combinedSumDuration,
    numParticipants: combinedNumParticipants,
    numSessions: trData.numSessions,
  };
}
