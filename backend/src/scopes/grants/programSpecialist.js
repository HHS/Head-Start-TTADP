import { expandArrayContains } from './utils';

export function withProgramSpecialist(names) {
  return expandArrayContains('programSpecialistName', names, false);
}

export function withoutProgramSpecialist(names) {
  return expandArrayContains('programSpecialistName', names, true);
}
