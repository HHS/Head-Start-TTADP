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
export default function useCookiePage(defaultPage, component) {
  // get sorting from cookie, otherwise fall back to default sorting
  // also memoize it so that we aren't constantly reading the cookie
  const url = useMemo(() => new URL(window.location), []);

  const cookieSchema = useMemo(() => `${url.hostname}-${url.pathname}-${url.search}-${component}-page`, [component, url]);
  const existingPage = useMemo(() => {
    const currentCookie = Cookies.get(cookieSchema);
    if (currentCookie) {
      const parsedCookie = parseInt(currentCookie, 10);
      if (!Number.isNaN(parsedCookie)) {
        return parsedCookie;
      }
    }

    return false;
  }, [cookieSchema]); // none of this stuff should be changing

  // put it in state
  const [currentPage, setCurrentPage] = useState(existingPage || defaultPage);

  useEffect(() => {
    // when sort config changes, update the cookie value
    Cookies.set(cookieSchema, currentPage, COOKIE_OPTIONS);
  // note that with url stored in a no dependency useMemo, it will not trigger re-renders
  // even if the url changes, like with a filter being applied
  }, [cookieSchema, currentPage]);

  return [currentPage, setCurrentPage];
}
