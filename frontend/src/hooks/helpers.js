/* eslint-disable import/prefer-default-export */
function sortFilters(a, b) {
  const topicA = a.topic;
  const topicB = b.topic;
  if (topicA < topicB) {
    return -1;
  }
  if (topicA > topicB) {
    return 1;
  }

  // names must be equal
  return 0;
}

function reduceFilters(filters, filter) {
  const [topics, queries, conditions] = filters;
  const { topic, query, condition } = filter;

  return [
    [...topics, topic], // topics
    [...queries, [query].flat()], // queries
    [...conditions, condition], // conditions
  ];
}

export function compareFilters(filters, filtersFromCookie) {
  if (filters.length !== filtersFromCookie.length) {
    return false;
  }

  // we are sorting and comparing copies here since
  // we don't want to change the order on the frontend
  const [
    topics, queries, conditions,
  ] = [...filters].sort(sortFilters).reduce(reduceFilters, [[], [], []]);

  const [
    cookieTopics,
    cookieQueries,
    cookieConditions,
  ] = [...filtersFromCookie].sort(sortFilters).reduce(reduceFilters, [[], [], []]);

  if (!topics.every((value, index) => value === cookieTopics[index])) {
    return false;
  }

  if (!conditions.every((value, index) => value === cookieConditions[index])) {
    return false;
  }

  const q = queries.sort().flat();
  const cq = cookieQueries.sort().flat();

  if (!q.every((value, index) => value === cq[index])) {
    return false;
  }

  return true;
}
