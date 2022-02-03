import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie'; // theres a package for it, look i know you can do it by hand but I don't wanna

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
export default function useCookieSorting(defaultSortConfig, component) {
  // get sorting from cookie, otherwise fall back to default sorting
  // also memoize it so that we aren't constantly reading the cookie
  const url = useMemo(() => new URL(window.location), []);
  // example: localhost:3000-/activity-reports-activityReportsTable-sorting
  const cookieSchema = useMemo(() => `${url.hostname}-${url.pathname}-${component}-sorting`, [component, url.hostname, url.pathname]);
  const existingSort = useMemo(() => {
    const currentCookie = Cookies.get(cookieSchema);
    if (currentCookie) {
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

    return false;
  }, [cookieSchema]); // none of this stuff should be changing

  // put it in state
  const [sortConfig, setSortConfig] = useState(existingSort || defaultSortConfig);

  useEffect(() => {
    // when sort config changes, update the cookie value
    Cookies.set(cookieSchema, JSON.stringify(sortConfig), COOKIE_OPTIONS);
  // note that with url stored in a no dependency useMemo, it will not trigger re-renders
  // even if the url changes, like with a filter being applied
  }, [cookieSchema, sortConfig]);

  return [sortConfig, setSortConfig];
}
