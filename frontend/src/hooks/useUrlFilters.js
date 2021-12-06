import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { filtersToQueryString, queryStringToFilters } from '../utils';

export default function useUrlFilters(defaultFilters) {
  const history = useHistory();

  const { replace } = history;

  const { search: historyLocationSearch } = history.location;

  /**
     * get the current window location
     */
  const url = new URL(window.location);

  // create a search param object from that
  const params = useMemo(() => new URLSearchParams(url.search), [url.search]);

  // default queries that are passed in
  const defaults = new URLSearchParams(filtersToQueryString(defaultFilters));

  let initialQueryValue = queryStringToFilters(defaults.toString());

  if (Array.from(params).length) {
    initialQueryValue = queryStringToFilters(params.toString());
  }

  const [query, setQuery] = useState(initialQueryValue);

  useEffect(() => {
    // create our query string
    const search = filtersToQueryString(query);

    // don't update history if its the same
    if (`?${search}` !== historyLocationSearch) {
      // clear all the params first
      params.forEach((value, key) => params.delete(key));

      // add the new value to the history
      replace({ search });
    }
  }, [replace, params, query, historyLocationSearch]);

  return [query, setQuery];
}
