/**
 * Shared predicates for the Regional PD w/ NC "national center facilitation flow" session form,
 * extracted from `src/services/event.ts` to a circular-import-free location
 * so the policy layer (`src/policies/event.js`) and the alert service can
 * import the same definitions without going through `event.ts`.
 *
 * Mirrors `frontend/src/pages/SessionForm/sessionFlow.js` so the backend and
 * frontend share a single source of truth.
 */

import type { EventShape, SessionShape } from './types/event';

export const REGIONAL_PD_WITH_NATIONAL_CENTERS = 'Regional PD Event (with National Centers)';
export const FACILITATION_NATIONAL_CENTER = 'national_center';
export const NATIONAL_CENTER_ROLE_NAME = 'NC';

/**
 * True when the supplied user has the National Center role.
 *
 * Returns false when user is null/undefined, when roles is missing or not an
 * array, and when a role entry is null/undefined (defensive against
 * unexpected shapes coming from the database or test fixtures).
 */
export const isNationalCenterUser = (
  user: { roles?: Array<{ name?: string } | null | undefined> | null } | null | undefined
): boolean =>
  Array.isArray(user?.roles) && user.roles.some((role) => role?.name === NATIONAL_CENTER_ROLE_NAME);

/**
 * True when the given event/session combination is the national center facilitation flow:
 * Regional PD Event (with National Centers) + facilitation === 'national_center'.
 *
 * In the national center facilitation flow the Regional owner's side of the session is tracked via
 * `ownerComplete` and the NC collaborator's side via `collabComplete`; POC is
 * normally not involved (but may create sessions and fill `pocComplete`).
 */
export const isNationalCenterFacilitator = (event: EventShape, session: SessionShape): boolean =>
  event.data?.eventOrganizer === REGIONAL_PD_WITH_NATIONAL_CENTERS &&
  session.data?.facilitation === FACILITATION_NATIONAL_CENTER;

/**
 * Single source of truth for "this session has been submitted for approval".
 *
 * Mirrors the `submitted` virtual on `SessionReportPilot`:
 *   approverId && collabComplete && (pocComplete || ownerComplete) for the
 *   national center facilitation flow; approverId && collabComplete && pocComplete
 *   otherwise.
 *
 * The NC flow accepts either `ownerComplete` or `pocComplete` because POCs
 * can create NC-flow sessions; owner-created sessions track completion via
 * `ownerComplete`, POC-created sessions via `pocComplete` (see
 * `frontend/src/pages/SessionForm/index.js` submit handler and the alert
 * logic in `src/services/event.ts`). Mirror this in
 * `frontend/src/pages/SessionForm/sessionFlow.js`.
 */
export const isSessionSubmitted = (event: EventShape, session: SessionShape): boolean => {
  if (!session?.data) return false;
  if (!session.approverId) return false;
  if (!session.data.collabComplete) return false;
  if (isNationalCenterFacilitator(event, session)) {
    return !!(session.data.ownerComplete || session.data.pocComplete);
  }
  return !!session.data.pocComplete;
};
