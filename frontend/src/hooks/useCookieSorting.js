import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie'; // theres a package for it, look i know you can do it by hand but I don't wanna
import { compareFilters, filterCookieSchema } from './helpers';

const COOKIE_OPTIONS = {
  sameSite: 'Lax',
};

/**
 * useCookieSorting takes in an object containing a sort configuration
 * ex: {
    sortBy: 'updatedAt',
    direction: 'desc',
  }
 * and a component name
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultSortConfig
 * @param {String} component
 * @returns {[ Object[], Function ]}
 */
export default function useCookieSorting(defaultSortConfig, component, filters) {
  // get sorting from cookie, otherwise fall back to default sorting
  // also memoize it so that we aren't constantly reading the cookie
  const url = useMemo(() => new URL(window.location), []);
  // example: localhost:3000-/activity-reports-activityReportsTable-sorting
  const cookieSchema = useMemo(() => `${url.hostname}-${url.pathname}-${component}-sorting`, [component, url.hostname, url.pathname]);
  const filterCookie = useMemo(() => filterCookieSchema(url), [url]);

  const existingSort = useMemo(() => {
    const currentCookie = Cookies.get(cookieSchema);
    const currentFilterCookie = Cookies.get(filterCookie);

    if (currentFilterCookie) {
      const theSame = compareFilters(filters, JSON.parse(currentFilterCookie));

      if (currentCookie && theSame) {
        const parsedCookie = JSON.parse(currentCookie);
        // this is really just to make sure nothing weird gets in there
        const {
          sortBy, direction,
        } = parsedCookie;
        return {
          sortBy,
          direction,
        };
      }
    }

    return false;
  }, [cookieSchema, filterCookie, filters]);

  // put it in state
  const [sortConfig, setSortConfig] = useState(existingSort || defaultSortConfig);

  useEffect(() => {
    // when sort config changes, update the cookie value
    Cookies.set(cookieSchema, JSON.stringify(sortConfig), COOKIE_OPTIONS);

    // we also need to push the filters to a cookie
    Cookies.set(filterCookie, JSON.stringify(filters), COOKIE_OPTIONS);
  }, [cookieSchema, filterCookie, filters, sortConfig]);

  return [sortConfig, setSortConfig];
}
