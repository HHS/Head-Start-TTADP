import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { filtersToQueryString, queryStringToFilters } from '../utils';

/**
 * useUrlFilters takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters) {
  /**
   * we'll use the history API to update the search params
   */
  const history = useHistory();
  const { replace, location: { search: historyLocationSearch } } = history;

  /**
  * A URL constructor for the current window location
  */
  const url = new URL(window.location);

  // we memoize this so it doesn't change on every load
  // create a search param object from that
  const params = useMemo(() => new URLSearchParams(url.search), [url.search]);

  // default queries that are passed in
  const defaults = new URLSearchParams(filtersToQueryString(defaultFilters));
  let initialQueryValue = queryStringToFilters(defaults.toString());

  if (Array.from(params).length) {
    initialQueryValue = queryStringToFilters(params.toString());
  }

  // - query is the set of data that the app can change
  // - set query is passed to the app so it can update it
  // - when query changes, we update the URL params
  const [query, setQuery] = useState(initialQueryValue);

  // - filters is derived from the URL params
  // - its the data we return to the app
  // - set filters is for internal use only
  const [filters, setFilters] = useState();

  // on first load
  useEffect(() => {
    setFilters(queryStringToFilters(params.toString()));
  }, [params]);

  // use effect to watch the query and update if changed
  useEffect(() => {
    // create our query string
    const search = filtersToQueryString(query);

    // don't update history if its the same
    if (`?${search}` !== historyLocationSearch) {
      // add the new value to the history
      replace({ search });
    }
  }, [replace, query, historyLocationSearch]);

  return [filters, setQuery];
}
