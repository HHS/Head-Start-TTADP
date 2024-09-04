import {
  useState,
  useEffect,
} from 'react';

export default function useSubFilters(
  filters,
  allowedFilters = [],
) {
  const [subFilters, setSubFilters] = useState(
    filters.filter((filter) => allowedFilters.includes(filter.topic)),
  );

  useEffect(() => {
    setSubFilters(filters.filter((filter) => allowedFilters.includes(filter.topic)));
  }, [allowedFilters, filters]);

  if (!allowedFilters || allowedFilters.length === 0) {
    return filters;
  }

  return subFilters;
}
