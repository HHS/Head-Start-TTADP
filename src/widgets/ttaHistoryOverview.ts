import overview from './overview';
import trSessionsForRecipient from './trSessionsForRecipient';
import type { IScopes } from './types';

/**
 * Combined widget for the TTA History tab overview row.
 * Returns all standard Activity Report overview metrics plus the count of
 * approved Training Report sessions for the recipient, so both can be rendered
 * in a single in-order field row.
 */
export default async function ttaHistoryOverview(
  scopes: IScopes,
  query: Record<string, unknown>
) {
  const [arData, trData] = await Promise.all([
    overview(scopes),
    trSessionsForRecipient(scopes, query),
  ]);

  return { ...arData, numSessions: trData.numSessions };
}
