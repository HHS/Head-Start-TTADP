import filterArray from './utils';
import {
  ALL_PARTICIPANTS,
} from '../../constants';

function onlyValidParticipants(query) {
  if (!Array.isArray(query)) {
    return [query].filter((reason) => ALL_PARTICIPANTS.includes(reason));
  }

  return query.filter((reason) => ALL_PARTICIPANTS.includes(reason));
}

export function withParticipants(query) {
  const participant = onlyValidParticipants(query);
  if (!participant.length) {
    return {};
  }

  return filterArray('ARRAY_TO_STRING("participants", \',\')', participant, false);
}

export function withoutParticipants(query) {
  const participant = onlyValidParticipants(query);
  if (!participant.length) {
    return {};
  }
  return filterArray('ARRAY_TO_STRING("participants", \',\')', participant, true);
}
