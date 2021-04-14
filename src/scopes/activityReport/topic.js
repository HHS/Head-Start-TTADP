import filterArray from './utils';

export function withTopics(topics) {
  return filterArray('ARRAY_TO_STRING(topics, \',\')', topics, false);
}

export function withoutTopics(topics) {
  return filterArray('ARRAY_TO_STRING(topics, \',\')', topics, true);
}
