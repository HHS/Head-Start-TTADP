import { act, renderHook } from '@testing-library/react-hooks';
import { useLayoutEffect } from 'react';
import { getRecipientTimeline } from '../../fetchers/recipient';
import useRecipientTimeline from '../useRecipientTimeline';

jest.mock('../../fetchers/recipient', () => ({ getRecipientTimeline: jest.fn() }));

const options = { direction: 'desc', filters: [], excludeMultiRecipientCommunications: false };
const events = (start, length) =>
  Array.from({ length }, (_, index) => ({
    source: 'activityReport',
    sourceId: start + index,
    eventType: 'TTA activity',
  }));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useRecipientTimeline', () => {
  beforeEach(() => getRecipientTimeline.mockReset());

  it('discards stale events and category metadata when the view changes', async () => {
    const previous = deferred();
    const categories = [{ label: 'Monitoring', statuses: ['In Progress'] }];
    getRecipientTimeline
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValueOnce({ count: 1, events: events(9, 1), categories });
    const { result, rerender, waitFor } = renderHook(
      (query) => useRecipientTimeline('401', '1', query),
      { initialProps: { ...options, view: 'chronological' } }
    );
    rerender({ ...options, view: 'goals' });
    await waitFor(() => expect(result.current.events).toEqual(events(9, 1)));
    await act(async () =>
      previous.resolve({
        count: 50,
        events: events(1, 25),
        categories: [{ label: 'Unrelated', statuses: [] }],
      })
    );
    expect(result.current.events).toEqual(events(9, 1));
    expect(result.current.categories).toEqual(categories);
    expect(result.current.count).toBe(1);
  });

  it('loads 25 automatically, locks concurrent requests, retains events and deduplicates batches', async () => {
    const next = deferred();
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 50, events: events(1, 25), nextCursor: 'after-25' })
      .mockReturnValueOnce(next.promise);
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(getRecipientTimeline).toHaveBeenCalledWith('401', '1', {
      ...options,
      limit: 25,
    });
    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
    expect(getRecipientTimeline).toHaveBeenLastCalledWith('401', '1', {
      ...options,
      limit: 25,
      cursor: 'after-25',
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toHaveLength(25);
    await act(async () => next.resolve({ count: 50, events: events(25, 25) }));
    expect(result.current.events).toHaveLength(49);
    expect(result.current.hasMore).toBe(false);
    act(() => {
      result.current.loadMore();
    });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
  });

  it('deduplicates an event whose type changes across slices while preserving other sources', async () => {
    const communication = {
      source: 'communicationLog',
      sourceId: 25,
      eventType: 'Email communication',
    };
    const firstPage = [...events(1, 24), communication];
    const distinctEvent = events(25, 1)[0];
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 27, events: firstPage, nextCursor: 'after-25' })
      .mockResolvedValueOnce({
        count: 27,
        events: [{ ...communication, eventType: 'Phone communication' }, distinctEvent],
      });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(result.current.events).toEqual([...firstPage, distinctEvent]);
  });

  it('retries a failed slice at the same cursor without losing loaded events', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 26, events: events(1, 25), nextCursor: 'after-25' })
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ count: 26, events: events(26, 1) });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.events).toHaveLength(25);
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(26));
    expect(getRecipientTimeline.mock.calls.slice(1).map((call) => call[2].cursor)).toEqual([
      'after-25',
      'after-25',
    ]);
    expect(result.current.error).toBe('');
  });

  it.each([
    { direction: 'asc' },
    { filters: [{ topic: 'date', condition: 'is on or after', query: '07/01/2026' }] },
    { excludeMultiRecipientCommunications: true },
    { recipientId: '402' },
    { regionId: '2' },
  ])(
    'resets pagination and ignores stale responses when the query changes: %j',
    async (changes) => {
      const old = deferred();
      getRecipientTimeline
        .mockResolvedValueOnce({ count: 50, events: events(1, 25), nextCursor: 'after-25' })
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ count: 1, events: events(100, 1) });
      const { result, rerender, waitFor } = renderHook(
        ({ recipientId = '401', regionId = '1', ...query }) =>
          useRecipientTimeline(recipientId, regionId, query),
        { initialProps: options }
      );
      await waitFor(() => expect(result.current.events).toHaveLength(25));
      act(() => {
        result.current.loadMore();
      });
      rerender({ ...options, ...changes });
      await waitFor(() => expect(result.current.events).toEqual(events(100, 1)));
      await act(async () => old.resolve({ count: 50, events: events(26, 25) }));
      expect(result.current.events).toEqual(events(100, 1));
      // The new query starts from the top rather than the old query's cursor.
      expect(getRecipientTimeline.mock.calls[2][2].cursor).toBeUndefined();
    }
  );

  it('does not update state after unmounting while a request is pending', async () => {
    const pending = deferred();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    getRecipientTimeline.mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useRecipientTimeline('401', '1', options));
    expect(result.current.loading).toBe(true);
    unmount();
    await act(async () => pending.resolve({ count: 1, events: events(1, 1) }));
    expect(result.current.events).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('stops paginating when the response has no next cursor, even if the count is higher', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 100, events: events(1, 25) });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(result.current.hasMore).toBe(false);
    act(() => {
      result.current.loadMore();
    });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
  });

  it('falls back to the loaded total when the response count is missing', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ events: events(1, 25) });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.count).toBe(25);
    act(() => {
      result.current.loadMore();
    });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
  });

  it('treats a response without an events array as an empty slice', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 10 });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('never reports a count lower than the number of loaded events', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 30, events: events(1, 25), nextCursor: 'after-25' })
      .mockResolvedValueOnce({ count: 20, events: events(26, 5) });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(30));
    expect(result.current.count).toBe(30);
  });

  it('clears previous events in the same render that the query changes', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 50, events: events(1, 25), nextCursor: 'after-25' })
      .mockReturnValueOnce(new Promise(() => {}));
    const renders = [];
    const { result, rerender, waitFor } = renderHook(
      (query) => {
        const state = useRecipientTimeline('401', '1', query);
        // Layout effects run only for committed renders, which is what the user sees painted.
        useLayoutEffect(() => {
          renders.push({ direction: query.direction, ...state });
        });
        return state;
      },
      { initialProps: options }
    );
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    rerender({ ...options, direction: 'asc' });
    const committed = renders.filter(({ direction }) => direction === 'asc');
    expect(committed.length).toBeGreaterThan(0);
    expect(committed.every(({ events: rendered }) => rendered.length === 0)).toBe(true);
    expect(committed.every(({ loading }) => loading)).toBe(true);
  });

  it('shows every event that still exists when a loaded event is deleted before the next slice', async () => {
    // Events 1 to 25 are loaded, then event 3 is deleted elsewhere. The cursor still points
    // past event 25, so event 26 is the next row; an offset of 25 would have skipped it.
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 30, events: events(1, 25), nextCursor: 'after-25' })
      .mockResolvedValueOnce({ count: 29, events: events(26, 4) });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(29));
    expect(result.current.events.map(({ sourceId }) => sourceId)).toEqual(
      Array.from({ length: 29 }, (_, index) => index + 1)
    );
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the categories from the first slice when later slices omit them', async () => {
    const categories = [{ label: 'Monitoring', statuses: ['In Progress'] }];
    getRecipientTimeline
      .mockResolvedValueOnce({
        count: 30,
        events: events(1, 25),
        categories,
        nextCursor: 'after-25',
      })
      .mockResolvedValueOnce({ count: 30, events: events(26, 5) });
    const { result, waitFor } = renderHook(() =>
      useRecipientTimeline('401', '1', { ...options, view: 'goals' })
    );
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(30));
    expect(result.current.categories).toEqual(categories);
  });

  it('appends categories first seen on a later slice after the known ones, without duplicates', async () => {
    const monitoring = { label: 'Monitoring', statuses: ['In Progress'] };
    const family = { label: 'Family Support', statuses: [] };
    const governance = { label: 'Governance', statuses: ['Closed'] };
    getRecipientTimeline
      .mockResolvedValueOnce({
        count: 80,
        events: events(1, 25),
        // Out of alphabetical order on purpose: existing order must survive.
        categories: [monitoring, governance],
        nextCursor: 'after-25',
      })
      .mockResolvedValueOnce({
        count: 80,
        events: events(26, 25),
        // Known labels are not repeated, and a label repeated within one slice is added once.
        categories: [governance, family, family, monitoring],
        nextCursor: 'after-50',
      })
      .mockResolvedValueOnce({ count: 80, events: events(51, 5), categories: [family] });
    const { result, waitFor } = renderHook(() =>
      useRecipientTimeline('401', '1', { ...options, view: 'goals' })
    );
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(result.current.categories).toEqual([monitoring, governance]);
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(50));
    expect(result.current.categories).toEqual([monitoring, governance, family]);
    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.events).toHaveLength(55));
    expect(result.current.categories).toEqual([monitoring, governance, family]);
  });

  it('stops on an empty slice even if the count has changed', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 10, events: [] });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });
});
