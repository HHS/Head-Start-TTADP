import {
  useMemo,
  useReducer,
} from 'react';
import { filtersToQueryString, queryStringToFilters } from '../utils';

const reducer = (state) => {
  const search = filtersToQueryString(state);
  /**
  * we'll use the history API to update the search params
  */
  window.history.replaceState(search, '');

  return [...state];
};

/**
 * useUrlFilters takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(initialValue) {
  /**
  * A URL constructor for the current window location
  * using useMemo to prevent the function from being recreated each time the hook is updated
  */
  const url = useMemo(() => new URL(window.location), []);

  // and params derived from the url params
  const params = useMemo(() => new URLSearchParams(url.search), [url.search]);

  const defaults = new URLSearchParams(filtersToQueryString(initialValue));
  let initialQueryValue = queryStringToFilters(defaults.toString());

  if (Array.from(params).length) {
    initialQueryValue = queryStringToFilters(params.toString());
  }

  const [filters, dispatch] = useReducer(reducer, initialQueryValue);

  // returning it like this creates a nice friendly useState-ish API
  return [filters, dispatch];
}
