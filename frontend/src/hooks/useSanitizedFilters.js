import { useMemo } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import useSessionFiltersAndReflectInUrl from './useSessionFiltersAndReflectInUrl';

/**
 * useSanitizedFilters wraps useSessionFiltersAndReflectInUrl and removes any
 * filter whose topic is not in the allowed set. Invalid filters (for example
 * from an old bookmarked URL or a filter that has since been removed from the
 * config) are stripped from the returned value, the URL and session storage so
 * they never reach the UI or the API.
 *
 * @param {String} key session storage key
 * @param {Object[]} defaultFilters
 * @param {Set<string>|string[]} validTopics allowed filter topic ids
 * @returns {[ Object[], Function ]}
 */
export default function useSanitizedFilters(key, defaultFilters, validTopics) {
  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(key, defaultFilters);

  const sanitizedFilters = useMemo(() => {
    return filters.filter((f) => validTopics.has(f.topic));
  }, [filters, validTopics]);

  useDeepCompareEffect(() => {
    setFilters(sanitizedFilters);
  }, [sanitizedFilters, setFilters]);

  return [filters, setFilters];
}
