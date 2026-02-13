import { useState, useEffect, useMemo } from 'react'

export default function useSubFilters(filters, filterConfig, allowedFilters = []) {
  const [subFilters, setSubFilters] = useState(filters.filter((filter) => allowedFilters.includes(filter.topic)))

  const filteredFilterConfig = useMemo(() => {
    if (!allowedFilters || allowedFilters.length === 0) {
      return filterConfig
    }
    return filterConfig.filter((filter) => allowedFilters.includes(filter.id))
  }, [allowedFilters, filterConfig])

  useEffect(() => {
    // save our energy if there are no allowed filters
    if (!allowedFilters || allowedFilters.length === 0) {
      return
    }
    setSubFilters(filters.filter((filter) => allowedFilters.includes(filter.topic)))
  }, [allowedFilters, filters])

  if (!allowedFilters || allowedFilters.length === 0) {
    return {
      subFilters: filters,
      filteredFilterConfig,
    }
  }

  return {
    subFilters,
    filteredFilterConfig,
  }
}
