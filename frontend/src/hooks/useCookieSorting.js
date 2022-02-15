import { useMemo, useContext } from 'react';
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
 * @returns {[ Object[], Function ]}
 */
export default function useCookieSorting(defaultSortConfig, component) {
  const { filterKey, filters } = useContext(FilterContext);
  const cookieSchema = `${filterKey}-${component}-sorting`;

  const existingSort = useMemo(() => {
    const currentFilterCookie = Cookies.get(filterKey);
    if (currentFilterCookie) {
      try {
        const theSame = compareFilters(filters, JSON.parse(currentFilterCookie));
        const currentCookie = Cookies.get(cookieSchema);
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
      } catch (error) {
        return false;
      }
    }

    return false;
  }, [cookieSchema, filterKey, filters]);

  // put it in state
  const [sortConfig, setSortConfig] = useCookieState(
    cookieSchema,
    existingSort || defaultSortConfig,
  );

  return [sortConfig, setSortConfig];
}
