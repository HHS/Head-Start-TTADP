import type {
  RecipientTimelineEvent,
  RecipientTimelineResponse,
} from '@ttahub/common/src/recipientTimeline';
import { useCallback, useRef, useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import { getRecipientTimeline } from '../fetchers/recipient';

interface TimelineOptions {
  direction: 'asc' | 'desc';
  filters: string[];
  excludeMultiRecipientCommunications: boolean;
}

const PAGE_SIZE = 25;

/**
 * Loads the recipient timeline in offset-paginated slices.
 *
 * Known limitation: offset pagination drifts if timeline data changes between slices.
 * Inserts ahead of the cursor shift rows forward and are handled by deduplication below.
 * Deletes or re-dated events ahead of the cursor shift rows backward, so the next slice
 * can skip an event. Fixing that needs keyset pagination (date plus id cursor) in the API.
 */
export default function useRecipientTimeline(
  recipientId: string,
  regionId: string,
  options: TimelineOptions
) {
  const [events, setEvents] = useState<RecipientTimelineEvent[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadedPages, setLoadedPages] = useState(0);
  const requestRef = useRef<() => void>(() => {});
  const loadMore = useCallback(() => requestRef.current(), []);

  // Reset during render when the query changes so the previous query's events and
  // "Load more" button are never painted alongside the new query.
  const queryKey = JSON.stringify([recipientId, regionId, options]);
  const [activeQueryKey, setActiveQueryKey] = useState(queryKey);
  if (activeQueryKey !== queryKey) {
    setActiveQueryKey(queryKey);
    setEvents([]);
    setCount(0);
    setHasMore(true);
    setLoading(true);
    setError('');
    setLoadedPages(0);
  }

  useDeepCompareEffectNoCheck(() => {
    let cancelled = false;
    let pending = false;
    let offset = 0;
    let exhausted = false;
    const seen = new Set<string>();

    async function loadPage() {
      if (cancelled || pending || exhausted) return;
      pending = true;
      setLoading(true);
      setError('');
      try {
        const response: RecipientTimelineResponse = await getRecipientTimeline(
          recipientId,
          regionId,
          {
            ...options,
            limit: PAGE_SIZE,
            offset,
          }
        );
        if (cancelled) return;
        const slice = Array.isArray(response?.events) ? response.events : [];
        const nextEvents = slice.filter((event) => {
          const key = JSON.stringify([event.source, event.sourceId]);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // Advance by the API slice, including duplicates, rather than the rendered count.
        offset += slice.length;
        const total =
          Number.isInteger(response?.count) && response.count >= 0 ? response.count : offset;
        exhausted = slice.length === 0 || offset >= total;
        setEvents((previous) => [...previous, ...nextEvents]);
        setCount(total);
        setHasMore(!exhausted);
        setLoadedPages((previous) => previous + 1);
      } catch (_err) {
        if (!cancelled) setError('Unable to load the TTA timeline.');
      } finally {
        pending = false;
        if (!cancelled) setLoading(false);
      }
    }

    requestRef.current = loadPage;
    loadPage();
    return () => {
      cancelled = true;
    };
  }, [recipientId, regionId, options]);

  // Rows deleted mid-scroll can drop the reported count below what is already rendered.
  return {
    events,
    count: Math.max(count, events.length),
    loading,
    error,
    hasMore,
    loadMore,
    loadedPages,
  };
}
