import { TTA_REQUEST_NOTE_ACTIONS, TTA_REQUEST_STEPS } from '@ttahub/common';
import type { TtaRequestNote } from '../../components/TtaRequestNotesSummary';
import type { TtaRequestNoteData, TtaRequestUser } from './types';

const noteKey = (step: string, action: string) => `${step}:${action}`;

/**
 * The phase each entry in a request's history is shown under, by the step it was left at and
 * what was done there. Later steps add their own, e.g. the reviewer sending it to the COR for
 * approval, or the approver approving it.
 */
const NOTE_PHASES: Record<string, string> = {
  [noteKey(TTA_REQUEST_STEPS.CREATOR, TTA_REQUEST_NOTE_ACTIONS.SUBMITTED)]: 'Draft TTA Request',
  [noteKey(TTA_REQUEST_STEPS.REVIEWER, TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION)]:
    'TTA Request review - needs action',
};

const STEP_ROLES: Record<TtaRequestNoteData['step'], TtaRequestNote['role']> = {
  creator: 'Creator',
  reviewer: 'Reviewer',
  approver: 'Approver',
};

/** the request's history as the notes summary shows it, in the order it happened */
export const toNotesSummary = (notes: TtaRequestNoteData[] = []): TtaRequestNote[] =>
  notes.map(({ id, step, action, note, createdAt, user }) => ({
    key: `note-${id}`,
    phase: NOTE_PHASES[noteKey(step, action)] ?? '',
    author: user?.fullName ?? user?.name ?? '',
    role: STEP_ROLES[step],
    date: createdAt,
    note,
  }));

/** the user's name with their roles, e.g. "Monica Geller (TTAC)" */
export const nameWithRole = (user: TtaRequestUser | null | undefined) => {
  if (!user) {
    return '';
  }
  const roles = (user.roles ?? []).map((role) => role.name).join(', ');
  return roles ? `${user.name} (${roles})` : user.name;
};

/** the latest review that sent the request back for changes, if there is one */
export const latestNeedsAction = (notes: TtaRequestNoteData[] = []) =>
  [...notes].reverse().find(({ action }) => action === TTA_REQUEST_NOTE_ACTIONS.NEEDS_ACTION) ??
  null;
