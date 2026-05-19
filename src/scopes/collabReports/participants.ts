import { COLLAB_REPORT_PARTICIPANTS } from '@ttahub/common';
import { filterExactArray } from '../activityReport/utils';

const VALID_PARTICIPANTS = new Set(COLLAB_REPORT_PARTICIPANTS);

const normalizeParticipants = (query: string[]) =>
  query
    .flatMap((item) => item.split(',').map((participant) => participant.trim()))
    .filter((participant) => VALID_PARTICIPANTS.has(participant));

const participantScope = (query: string[], exclude = false) => {
  const participants = normalizeParticipants(query);
  if (!participants.length) {
    return {};
  }

  return filterExactArray('"CollabReport"."participants"', participants, exclude);
};

export const withParticipants = (query: string[]) => participantScope(query);

export const withoutParticipants = (query: string[]) => participantScope(query, true);
