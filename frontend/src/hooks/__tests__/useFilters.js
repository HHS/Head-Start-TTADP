import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import useFilters from '../useFilters';
import AriaLiveContext from '../../AriaLiveContext';

describe('useFilters', () => {
  const user = { homeRegionId: 1 };
  const filterKey = 'testFilterKey';
  const manageRegions = false;

  const wrapper = ({ children }) => (
    <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
      {children}
    </AriaLiveContext.Provider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFilters(user, filterKey, manageRegions), { wrapper });

    expect(result.current.regions).toEqual([]);
    expect(result.current.defaultRegion).toEqual(1);
    expect(result.current.hasMultipleRegions).toEqual(false);
    expect(result.current.allRegionsFilters).toEqual([]);
    expect(result.current.defaultFilters).toEqual([]);
    expect(result.current.filters).toEqual([]);
  });

  it('should update filters when onApplyFilters is called', () => {
    const { result } = renderHook(() => useFilters(user, filterKey, manageRegions), { wrapper });

    const newFilters = [{ id: 1 }];
    act(() => {
      result.current.onApplyFilters(newFilters, true);
    });

    expect(result.current.filters).toEqual([...result.current.allRegionsFilters, ...newFilters]);
  });

  it('should add back in default regions when onRemoveFilter is called with addBackDefaultRegions = true', () => {
    const { result } = renderHook(() => useFilters(user, filterKey, manageRegions), { wrapper });
    const filterIdToRemove = 1;
    act(() => {
      result.current.onRemoveFilter(filterIdToRemove, true);
    });

    expect(result.current.filters).toEqual([...result.current.allRegionsFilters]);
  });
});
