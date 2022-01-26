import { expandArrayContains } from './utils';

export function withGrantNumber(grantNumbers) {
  return expandArrayContains('number', grantNumbers, false);
}

export function withoutGrantNumber(grantNumbers) {
  return expandArrayContains('number', grantNumbers, true);
}
