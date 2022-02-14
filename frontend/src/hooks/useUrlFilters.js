import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { queryStringToFilters, filtersToQueryString } from '../utils';
import { filterCookieSchema } from './helpers';

const filterCookie = filterCookieSchema(new URL(window.location));

// hoisting this fellow as to not get embroiled in useEffects
const { history } = window;

const COOKIE_OPTIONS = {
  sameSite: 'Lax',
};

/**
 * useUrlFilters takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters) {
  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const params = useMemo(() => queryStringToFilters(new URL(window.location).search.substr(1)), []);
  const [filters, setFilters] = useState(params.length ? params : defaultFilters);

  // use effect to watch the query and update if changed
  useEffect(() => {
    // create our query string
    const search = filtersToQueryString(filters);
    history.pushState(null, null, `?${search}`);

    // save the filters to a cookie
    Cookies.set(filterCookie, JSON.stringify(filters), COOKIE_OPTIONS);
  }, [filters]);

  return [filters, setFilters];
}
