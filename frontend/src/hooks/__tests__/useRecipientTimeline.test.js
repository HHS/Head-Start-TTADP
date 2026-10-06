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

  it('loads 25 automatically, locks concurrent requests, retains events and deduplicates batches', async () => {
    const next = deferred();
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 50, events: events(1, 25) })
      .mockReturnValueOnce(next.promise);
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.events).toHaveLength(25));
    expect(getRecipientTimeline).toHaveBeenCalledWith('401', '1', {
      ...options,
      limit: 25,
      offset: 0,
    });
    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
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
      .mockResolvedValueOnce({ count: 27, events: firstPage })
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

  it('retries a failed slice at the same offset without losing loaded events', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 26, events: events(1, 25) })
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
    expect(getRecipientTimeline.mock.calls.slice(1).map((call) => call[2].offset)).toEqual([
      25, 25,
    ]);
    expect(result.current.error).toBe('');
  });

  it.each([
    { direction: 'asc' },
    { filters: ['new filter'] },
    { excludeMultiRecipientCommunications: true },
    { recipientId: '402' },
    { regionId: '2' },
  ])(
    'resets pagination and ignores stale responses when the query changes: %j',
    async (changes) => {
      const old = deferred();
      getRecipientTimeline
        .mockResolvedValueOnce({ count: 50, events: events(1, 25) })
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
      expect(getRecipientTimeline.mock.calls[2][2].offset).toBe(0);
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

  it('stops paginating when the response count is missing', async () => {
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
      .mockResolvedValueOnce({ count: 30, events: events(1, 25) })
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
      .mockResolvedValueOnce({ count: 50, events: events(1, 25) })
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

  it('stops on an empty slice even if the count has changed', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 10, events: [] });
    const { result, waitFor } = renderHook(() => useRecipientTimeline('401', '1', options));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });
});
