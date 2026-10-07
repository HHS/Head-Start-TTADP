import { act, renderHook } from '@testing-library/react-hooks';
import useDataUpdates, { notifyDataUpdates } from '../useDataUpdates';

it('updates all subscribers to a topic without updating other topics', () => {
  const first = renderHook(() => useDataUpdates('notifications'));
  const second = renderHook(() => useDataUpdates('notifications'));
  const other = renderHook(() => useDataUpdates('reports'));

  act(() => notifyDataUpdates('notifications'));

  expect(first.result.current).toBe(1);
  expect(second.result.current).toBe(1);
  expect(other.result.current).toBe(0);
});

it('unsubscribes on unmount while keeping other subscribers active', () => {
  const first = renderHook(() => useDataUpdates('notifications'));
  const second = renderHook(() => useDataUpdates('notifications'));
  first.unmount();

  act(() => notifyDataUpdates('notifications'));

  expect(first.result.current).toBe(0);
  expect(second.result.current).toBe(1);
  second.unmount();
  expect(() => notifyDataUpdates('notifications')).not.toThrow();
});

it('moves the subscription when the topic changes', () => {
  const { result, rerender } = renderHook(({ topic }) => useDataUpdates(topic), {
    initialProps: { topic: 'notifications' },
  });
  rerender({ topic: 'reports' });
  act(() => notifyDataUpdates('notifications'));
  expect(result.current).toBe(0);
  act(() => notifyDataUpdates('reports'));
  expect(result.current).toBe(1);
});
