/**
 * Training report event IDs are formatted R##-PD-#### or R##-TR-#### (e.g. R01-PD-1234),
 * so the region is known from the URL before the event itself is fetched.
 * This lets region-dependent requests start in parallel with the event fetch.
 *
 * @returns the region id, or null if the event id is not in the expected format
 */
export default function regionIdFromEventId(eventId: string | undefined | null): number | null {
  if (!eventId) {
    return null;
  }

  const match = /^R(\d{2})-(?:PD|TR)-/i.exec(eventId);
  if (!match) {
    return null;
  }

  const regionId = Number(match[1]);
  return regionId > 0 ? regionId : null;
}
