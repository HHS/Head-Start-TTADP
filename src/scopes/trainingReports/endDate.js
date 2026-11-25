import { afterDateScope, beforeDateScope, withinDateScope } from './dateUtils';

// Lets session-level widgets drop the event end-date predicate and apply it to sessions instead.
const endDateScopes = new WeakSet();

function track(scope) {
  endDateScopes.add(scope);
  return scope;
}

export function isEndDateScope(scope) {
  return endDateScopes.has(scope);
}

export function beforeEndDate(date) {
  return track(beforeDateScope('endDate', date));
}

export function afterEndDate(date) {
  return track(afterDateScope('endDate', date));
}

export function withinEndDates(dates) {
  return track(withinDateScope('endDate', dates));
}
