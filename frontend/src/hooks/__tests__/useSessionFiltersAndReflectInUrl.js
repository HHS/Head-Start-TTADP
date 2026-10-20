import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import useSessionFiltersAndReflectInUrl from '../useSessionFiltersAndReflectInUrl';

const wrapper =
  (history) =>
  ({ children }) => <Router history={history}>{children}</Router>;

describe('useSessionFiltersAndReflectInUrl', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('does not add a history entry when an empty filter set rerenders', () => {
    const history = createMemoryHistory({ initialEntries: ['/timeline'] });
    const { rerender } = renderHook(() => useSessionFiltersAndReflectInUrl('empty-filters', []), {
      wrapper: wrapper(history),
    });

    expect(history.length).toBe(1);
    rerender();
    expect(history.length).toBe(1);
  });
});
