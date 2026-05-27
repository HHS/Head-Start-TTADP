import { act, renderHook } from '@testing-library/react-hooks';
import useExpanderFocusClick from '../useExpanderFocusClick';

jest.useFakeTimers();

describe('useExpanderFocusClick', () => {
  it('toggles expanded state on click', () => {
    const { result } = renderHook(() => useExpanderFocusClick());
    expect(result.current.expanded).toBe(false);

    act(() => {
      result.current.handleExpanderClick();
    });

    expect(result.current.expanded).toBe(true);
  });

  it('calls focus on btnRef.current after timeout when ref is set', () => {
    const { result } = renderHook(() => useExpanderFocusClick());
    const mockFocus = jest.fn();
    // Set the ref to a mock element
    result.current.btnRef.current = { focus: mockFocus };

    act(() => {
      result.current.handleExpanderClick();
      jest.advanceTimersByTime(200);
    });

    expect(mockFocus).toHaveBeenCalled();
  });

  it('does not throw when btnRef.current is null at timeout time', () => {
    // Covers the `if (btnRef.current)` false branch
    const { result } = renderHook(() => useExpanderFocusClick());
    // btnRef.current is null by default
    expect(() => {
      act(() => {
        result.current.handleExpanderClick();
        jest.advanceTimersByTime(200);
      });
    }).not.toThrow();
  });
});
