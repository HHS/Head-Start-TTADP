import {
  useState,
  useEffect,
  useMemo,
} from 'react';

export default function useSubFilters(
  filters,
  filterConfig,
  allowedFilters = [],
) {
  const [subFilters, setSubFilters] = useState(
    filters.filter((filter) => allowedFilters.includes(filter.topic)),
  );

  // eslint-disable-next-line max-len
  const filteredFilterConfig = useMemo(() => filterConfig.filter((filter) => allowedFilters.includes(filter.id)), [allowedFilters, filterConfig]);

  useEffect(() => {
    setSubFilters(filters.filter((filter) => allowedFilters.includes(filter.topic)));
  }, [allowedFilters, filters]);

  if (!allowedFilters || allowedFilters.length === 0) {
    return { subFilters: filters, filteredFilterConfig: filterConfig };
  }

  return {
    subFilters,
    filteredFilterConfig,
  };
}
