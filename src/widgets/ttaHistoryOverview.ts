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
 * `numParticipants` represents the total participants on approved Activity
 * Reports AND approved Training Report sessions combined for the recipient,
 * so the "Participants" widget reflects both delivery channels.
 */
export default async function ttaHistoryOverview(
  scopes: IScopes,
  // Accepted to match the widget runner signature in
  // src/routes/widgets/handlers.js; not currently used by this widget.
  _query: Record<string, unknown>
): Promise<Record<string, string> & { numSessions: string }> {
  const [arData, trData] = await Promise.all([
    overview(scopes),
    trSessionsForRecipient(scopes),
  ]);

  // `overview` returns numParticipants formatted with toLocaleString (e.g. "1,234"),
  // so strip thousands separators before parsing to combine with the raw numeric
  // TR participant total.
  const arParticipants = parseFloat((arData.numParticipants || '0').replace(/,/g, '')) || 0;
  const combinedNumParticipants = formatNumber(arParticipants + trData.numParticipants);

  return {
    ...arData,
    numParticipants: combinedNumParticipants,
    numSessions: trData.numSessions,
  };
}
