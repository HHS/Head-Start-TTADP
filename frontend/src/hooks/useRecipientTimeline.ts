import type {
  RecipientTimelineCategory,
  RecipientTimelineEvent,
  RecipientTimelineFilter,
  RecipientTimelineResponse,
  RecipientTimelineView,
} from '@ttahub/common/src/recipientTimeline';
import { useCallback, useRef, useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import { getRecipientTimeline } from '../fetchers/recipient';

interface TimelineOptions {
  view?: RecipientTimelineView;
  direction: 'asc' | 'desc';
  filters: RecipientTimelineFilter[];
  excludeMultiRecipientCommunications: boolean;
}

const PAGE_SIZE = 25;

/**
 * Loads the recipient timeline in slices chained by the API's keyset cursor.
 *
 * Each slice starts right after the last event of the previous one, so events added or deleted
 * between slices cannot shift later slices and skip an event. Deduplication below still guards
 * against an event that was re-dated into a range already loaded.
 */
export default function useRecipientTimeline(
  recipientId: string,
  regionId: string,
  options: TimelineOptions
) {
  const [events, setEvents] = useState<RecipientTimelineEvent[]>([]);
  const [count, setCount] = useState(0);
  const [categories, setCategories] = useState<RecipientTimelineCategory[]>([]);
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
    setCategories([]);
    setHasMore(true);
    setLoading(true);
    setError('');
    setLoadedPages(0);
  }

  useDeepCompareEffectNoCheck(() => {
    let cancelled = false;
    let pending = false;
    let cursor: string | undefined;
    let loaded = 0;
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
            ...(cursor ? { cursor } : {}),
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
        // Continue from the API's cursor, which points past the last event of the slice.
        cursor =
          typeof response?.nextCursor === 'string' && response.nextCursor
            ? response.nextCursor
            : undefined;
        loaded += slice.length;
        const total =
          Number.isInteger(response?.count) && response.count >= 0 ? response.count : loaded;
        exhausted = slice.length === 0 || !cursor;
        setEvents((previous) => [...previous, ...nextEvents]);
        setCount(total);
        // Grouped views send their categories with the first slice only.
        if (Array.isArray(response?.categories)) setCategories(response.categories);
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
    categories,
    count: Math.max(count, events.length),
    loading,
    error,
    hasMore,
    loadMore,
    loadedPages,
  };
}
