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
 * @param {Object[]} filters array of filters
 * @returns {[ Object[], Function ]}
 */
export default function useCookiePage(defaultPage, component, filters) {
  // get sorting from cookie, otherwise fall back to default sorting
  // also memoize it so that we aren't constantly reading the cookie
  const url = useMemo(() => new URL(window.location), []);

  const cookieSchema = useMemo(() => `${url.hostname}-${url.pathname}-${component}-page`, [component, url]);
  const filterCookie = useMemo(() => filterCookieSchema(url), [url]);

  const existingPage = useMemo(() => {
    const currentCookie = Cookies.get(cookieSchema);
    const currentFilterCookie = Cookies.get(filterCookie);
    if (currentFilterCookie) {
      const theSame = compareFilters(filters, JSON.parse(currentFilterCookie));
      if (currentCookie && theSame) {
        const parsedCookie = parseInt(currentCookie, 10);
        if (!Number.isNaN(parsedCookie)) {
          return parsedCookie;
        }
      }
    }

    return false;
  }, [cookieSchema, filterCookie, filters]);

  // put it in state
  const [currentPage, setCurrentPage] = useState(existingPage || defaultPage);

  useEffect(() => {
    // when selected page changes, update the cookie value
    Cookies.set(cookieSchema, currentPage, COOKIE_OPTIONS);
  }, [cookieSchema, currentPage]);

  return [currentPage, setCurrentPage];
}
