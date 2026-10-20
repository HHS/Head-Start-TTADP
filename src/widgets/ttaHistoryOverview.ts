import overview from './overview';
import trSessionsForRecipient from './trSessionsForRecipient';
import { formatNumber, parseFormattedNumber } from './helpers';
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
 *
 * `inPerson` represents the count of in-person activities across approved
 * Activity Reports AND approved Training Report sessions combined for the
 * recipient, so the "In person activities" widget reflects both delivery
 * channels.
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

  // `overview` returns AR aggregates as locale-formatted strings (e.g.
  // "1,234.5"), so use `parseFormattedNumber` to strip thousands separators
  // and coerce to a number before summing with the raw numeric TR values.
  const combinedSumDuration = formatNumber(
    parseFormattedNumber(arData.sumDuration) + trData.sumDuration,
    1,
  );
  const combinedNumParticipants = formatNumber(
    parseFormattedNumber(arData.numParticipants) + trData.numParticipants,
  );
  const combinedInPerson = formatNumber(
    parseFormattedNumber(arData.inPerson) + trData.numInPerson,
  );

  return {
    ...arData,
    sumDuration: combinedSumDuration,
    numParticipants: combinedNumParticipants,
    inPerson: combinedInPerson,
    numSessions: trData.numSessions,
  };
}
