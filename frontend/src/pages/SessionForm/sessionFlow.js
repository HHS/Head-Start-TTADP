import { TRAINING_EVENT_ORGANIZER } from '../../Constants';

/**
 * Shared predicates for the Regional PD w/ NC "national center facilitation flow" session form.
 *
 * These helpers replace ad-hoc, duplicated checks for the NC role and the
 * new-flow (eventOrganizer + facilitation) combination across the session
 * form, hooks, and review components. Keep call sites importing from here
 * so a future role rename or flow change has a single point of edit.
 */

export const NATIONAL_CENTER_ROLE_NAME = 'NC';
export const FACILITATION_NATIONAL_CENTER = 'national_center';

/**
 * True when the supplied user has the National Center role.
 *
 * Returns false when user is null/undefined, when roles is missing or not an
 * array, and when a role entry is null/undefined (defensive against
 * unexpected shapes coming from the API or test fixtures).
 *
 * @param {object | null | undefined} user
 * @returns {boolean}
 */
export const isNationalCenterUser = (user) =>
  Array.isArray(user?.roles) && user.roles.some((role) => role?.name === NATIONAL_CENTER_ROLE_NAME);

/**
 * True when the given event/session combination is the national center facilitation flow:
 * Regional PD Event (with National Centers) + facilitation === 'national_center'.
 *
 * Accepts an object so call sites can pass either explicit values
 * (`{ eventOrganizer, facilitation }`) or destructure from form/session data.
 *
 * @param {{ eventOrganizer?: string | null, facilitation?: string | null }} args
 * @returns {boolean}
 */
export const isNationalCenterFacilitator = ({ eventOrganizer, facilitation } = {}) =>
  eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS &&
  facilitation === FACILITATION_NATIONAL_CENTER;
