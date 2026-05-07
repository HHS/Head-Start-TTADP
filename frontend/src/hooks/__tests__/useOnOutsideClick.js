import { renderHook } from '@testing-library/react-hooks';
import { act } from '@testing-library/react';
import useOnClickOutside from '../useOnOutsideClick';

describe('useOnClickOutside', () => {
  it('calls handler when all refs have null current (covers if (ref.current) false branch)', () => {
    const handler = jest.fn();
    // Passing a ref with null current — the `if (ref.current)` check returns false,
    // meaning clickedOutsideOfAnyRef is false, so handler is invoked.
    const nullRef = { current: null };

    renderHook(() => useOnClickOutside(handler, [nullRef]));

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(handler).toHaveBeenCalled();
  });

  it('does NOT call handler when click is inside a ref element (covers if (clickedOutsideOfAnyRef) true branch)', () => {
    const handler = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const child = document.createElement('span');
    container.appendChild(child);
    const ref = { current: container };

    renderHook(() => useOnClickOutside(handler, [ref]));

    act(() => {
      // Dispatch on the child — bubbles up through container, so ref.current.contains returns true
      child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });
});
