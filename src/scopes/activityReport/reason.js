import filterArray from './utils';
import { REASONS } from '../../constants';

function onlyValidReasons(query) {
  if (!Array.isArray(query)) {
    return [query].filter((reason) => REASONS.includes(reason));
  }

  return query.filter((reason) => REASONS.includes(reason));
}

export function withReason(query) {
  const reason = onlyValidReasons(query);
  if (!reason.length) {
    return {};
  }

  return filterArray('ARRAY_TO_STRING(reason, \',\')', reason, false);
}

export function withoutReason(query) {
  const reason = onlyValidReasons(query);
  if (!reason.length) {
    return {};
  }
  return filterArray('ARRAY_TO_STRING(reason, \',\')', reason, true);
}
