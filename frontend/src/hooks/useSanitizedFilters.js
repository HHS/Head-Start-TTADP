import { useEffect, useMemo, useRef } from 'react';
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

  const allowedTopics = useMemo(
    () => (validTopics instanceof Set ? validTopics : new Set(validTopics)),
    [validTopics]
  );

  // Keep the sanitized array referentially stable when its contents are
  // unchanged. Consumers compare the filters prop by reference, so returning a
  // fresh array every render would fire redundant, identical fetches.
  const previousSanitized = useRef(null);
  const sanitizedFilters = useMemo(() => {
    const next = filters.filter((f) => allowedTopics.has(f.topic));
    const previous = previousSanitized.current;
    if (
      previous
      && previous.length === next.length
      && previous.every((filter, index) => filter === next[index])
    ) {
      return previous;
    }
    previousSanitized.current = next;
    return next;
  }, [filters, allowedTopics]);

  // Write the sanitized list back so the URL and session storage reflect only
  // valid filters. Guarded on length so we only write when something changed.
  useEffect(() => {
    if (sanitizedFilters.length !== filters.length) {
      setFilters(sanitizedFilters);
    }
  }, [sanitizedFilters, filters.length, setFilters]);

  return [sanitizedFilters, setFilters];
}
