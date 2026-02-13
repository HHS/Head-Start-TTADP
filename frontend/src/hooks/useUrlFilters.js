import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { filtersToQueryString, queryStringToFilters } from '../utils'

/**
 * useUrlFilters takes in an array of default filters
 * and watches them to update the URL in a useEffect
 *
 * @param {String} key
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters) {
  const history = useHistory()
  const location = useLocation()

  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const initialValue = useMemo(() => {
    const params = queryStringToFilters(location.search.substring(1))
    if (params.length) {
      return params
    }
    return defaultFilters
  }, [defaultFilters, location.search])

  const updateUrl = (filters) => {
    const search = `?${filtersToQueryString(filters)}`
    if (search === location.search) return
    history.push({ ...location, search })
  }

  return [initialValue, updateUrl]
}
