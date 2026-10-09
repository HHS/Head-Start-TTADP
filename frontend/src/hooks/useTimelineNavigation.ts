import type { RecipientTimelineFilter } from '@ttahub/common/src/recipientTimeline';
import { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useRecipientTimeline from './useRecipientTimeline';

interface TimelineView {
  recipientId: string;
  regionId: string;
  direction: 'asc' | 'desc';
  excludeMultiRecipientCommunications: boolean;
}

interface TimelinePosition {
  queryKey: string;
  loadedPages: number;
  eventKey: string | null;
  top: number;
  scrollY: number;
}

interface TimelineLocationState {
  timelineView?: TimelineView;
  timelinePosition?: TimelinePosition;
}

function savedPosition(state: TimelineLocationState): TimelinePosition | null {
  const position = state?.timelinePosition;
  if (
    !position ||
    typeof position.queryKey !== 'string' ||
    !Number.isSafeInteger(position.loadedPages) ||
    position.loadedPages < 1 ||
    !Number.isFinite(position.top) ||
    !Number.isFinite(position.scrollY) ||
    position.scrollY < 0 ||
    (position.eventKey !== null && typeof position.eventKey !== 'string')
  )
    return null;
  return position;
}

/**
 * Restore this browser history entry without adding an entry for each scroll or API slice.
 *
 * `filterQuery` keys the saved position. Pass the URL query string rather than
 * `filters`: panel filters can change shape on the URL round trip (a date "is" value comes
 * back as an array), so their serialized form would not match after Back or refresh.
 */
export default function useTimelineNavigation(
  recipientId: string,
  regionId: string,
  filters: RecipientTimelineFilter[],
  filterQuery: string
) {
  const history = useHistory<TimelineLocationState>();
  const location = useLocation<TimelineLocationState>();
  const savedView = location.state?.timelineView;
  const matchingView = savedView?.recipientId === recipientId && savedView?.regionId === regionId;
  const direction = matchingView && savedView.direction === 'asc' ? 'asc' : 'desc';
  const excludeMultiRecipientCommunications =
    matchingView && savedView.excludeMultiRecipientCommunications === true;
  const view: TimelineView = {
    recipientId,
    regionId,
    direction,
    excludeMultiRecipientCommunications,
  };
  const queryKey = JSON.stringify([
    recipientId,
    regionId,
    direction,
    excludeMultiRecipientCommunications,
    filterQuery,
  ]);
  const timeline = useRecipientTimeline(recipientId, regionId, {
    direction,
    excludeMultiRecipientCommunications,
    filters,
  });
  const listRef = useRef<HTMLOListElement>(null);
  const [restore, setRestore] = useState(() => savedPosition(location.state));
  const [activeQuery, setActiveQuery] = useState(queryKey);
  if (activeQuery !== queryKey) {
    setActiveQuery(queryKey);
    setRestore(savedPosition(location.state));
  }
  const target = restore?.queryKey === queryKey ? restore : null;
  const restoring = Boolean(target);
  const { loadedPages, loading, error, hasMore, loadMore } = timeline;

  useEffect(
    () =>
      history.listen((next, action) => {
        if (action === 'POP') setRestore(savedPosition(next.state));
      }),
    [history]
  );

  // The browser cannot restore a deep scroll position until the preceding slices exist.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (!target || loading || error) return;
    if (loadedPages < target.loadedPages && hasMore) {
      loadMore();
      return;
    }
    const anchor = Array.from(listRef.current?.children || []).find(
      (element) => (element as HTMLElement).dataset.timelineEvent === target.eventKey
    );
    const bounds = anchor?.getBoundingClientRect();
    // Details may now be collapsed: keep at least part of the saved event in view.
    const anchorTop = bounds ? Math.max(target.top, 1 - bounds.height) : target.top;
    // If the event was removed, the browser clamps the saved scroll to the remaining content.
    window.scrollTo({
      top: Math.max(0, bounds ? window.scrollY + bounds.top - anchorTop : target.scrollY),
      behavior: 'auto',
    });
    setRestore(null);
  }, [target, loading, error, loadedPages, hasMore, loadMore]);

  const saveRef = useRef(() => {});
  saveRef.current = () => {
    if (
      restoring ||
      loadedPages === 0 ||
      history.location.pathname !== location.pathname ||
      history.location.search !== location.search
    )
      return;
    const rows = Array.from(listRef.current?.children || []) as HTMLElement[];
    const anchor = rows.find((row) => row.getBoundingClientRect().bottom > 0);
    const position: TimelinePosition = {
      queryKey,
      loadedPages,
      eventKey: anchor?.dataset.timelineEvent || null,
      top: anchor?.getBoundingClientRect().top || 0,
      scrollY: window.scrollY,
    };
    const state = history.location.state;
    // The top of the timeline restores itself, however many slices infinite scroll loaded.
    // Skipping it avoids replacing location state while the recipient record is still loading,
    // which would refetch the recipient.
    const nothingToRestore = position.scrollY === 0 && !state?.timelinePosition;
    if (
      nothingToRestore ||
      (JSON.stringify(state?.timelinePosition) === JSON.stringify(position) &&
        JSON.stringify(state?.timelineView) === JSON.stringify(view))
    )
      return;
    history.replace({
      ...history.location,
      state: { ...state, timelineView: view, timelinePosition: position },
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadedPages and queryKey trigger a save after each slice or query change
  useEffect(() => {
    if (!loading && !error && !restoring) saveRef.current();
  }, [loading, error, restoring, loadedPages, queryKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(timer);
      saveRef.current();
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    // Save before a router link changes the history entry, even during the scroll debounce.
    document.addEventListener('click', save, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('click', save, true);
    };
  }, []);

  const setView = (changes: Partial<TimelineView>) =>
    history.replace({
      ...history.location,
      state: {
        ...history.location.state,
        timelineView: { ...view, ...changes },
        timelinePosition: undefined,
      },
    });

  return {
    ...timeline,
    direction,
    excludeMultiRecipientCommunications,
    setView,
    listRef,
    restoring,
  };
}
