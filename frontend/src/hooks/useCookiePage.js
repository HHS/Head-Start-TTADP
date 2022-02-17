import { useContext, useMemo } from 'react';
import Cookies from 'js-cookie'; // theres a package for it, look i know you can do it by hand but I don't wanna
import { compareFilters } from './helpers';
import useCookieState from './useCookieState';
import FilterContext from '../FilterContext';

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
export default function useCookiePage(defaultPage, component) {
  const { filterKey, filters } = useContext(FilterContext);
  const cookieSchema = `${filterKey}-${component}-page`;

  const existingPage = useMemo(() => {
    const currentFilterCookie = Cookies.get(filterKey);
    if (currentFilterCookie) {
      try {
        const theSame = compareFilters(filters, JSON.parse(currentFilterCookie));
        const currentCookie = Cookies.get(cookieSchema);
        if (currentCookie && theSame) {
          const parsedCookie = parseInt(currentCookie, 10);
          if (!Number.isNaN(parsedCookie)) {
            return parsedCookie;
          }
        }
      } catch (error) {
        return false;
      }
    }

    return false;
  }, [cookieSchema, filterKey, filters]);

  // put it in state
  const [currentPage, setCurrentPage] = useCookieState(
    cookieSchema,
    existingPage || defaultPage,
  );

  return [currentPage, setCurrentPage];
}
