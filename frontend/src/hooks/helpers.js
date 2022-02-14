export const filterCookieSchema = (url) => `${url.hostname}-${url.pathname}-filters`;

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
    [...queries, query], // queries
    [...conditions, condition], // conditions
  ];
}

export function compareFilters(filters, filtersFromCookie) {
  if (filters.length !== filtersFromCookie.length) {
    return false;
  }

  // sort filters by topic
  filters.sort(sortFilters);
  filtersFromCookie.sort(sortFilters);

  const [topics, queries, conditions] = filters.reduce(reduceFilters, [[], [], []]);
  const [
    cookieTopics,
    cookieQueries,
    cookieConditions,
  ] = filtersFromCookie.reduce(reduceFilters, [[], [], []]);

  if (!topics.every((value, index) => value === cookieTopics[index])) {
    return false;
  }

  if (!queries.every((value, index) => value === cookieQueries[index])) {
    return false;
  }

  if (!conditions.every((value, index) => value === cookieConditions[index])) {
    return false;
  }

  return true;
}
