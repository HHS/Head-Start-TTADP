import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { MemoryRouter } from 'react-router';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import useFilters from '../useFilters';
import AriaLiveContext from '../../AriaLiveContext';

describe('useFilters', () => {
  const user = { homeRegionId: 1 };
  const filterKey = 'testFilterKey';
  const manageRegions = false;

  const wrapper = ({ children }) => (
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
        {children}
      </AriaLiveContext.Provider>
    </MemoryRouter>
  );

  it('handles general use', () => {
    const { result } = renderHook(() => useFilters(user, filterKey, manageRegions), { wrapper });

    expect(result.current.regions).toEqual([]);
    expect(result.current.defaultRegion).toEqual(1);
    expect(result.current.hasMultipleRegions).toEqual(false);
    expect(result.current.allRegionsFilters).toEqual([]);
    expect(result.current.defaultFilters).toEqual([]);
    expect(result.current.filters).toEqual([]);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFilters(user, filterKey), { wrapper });

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

  it('handles removing a filter that is not present', () => {
    const { result } = renderHook(() => useFilters(user, filterKey, manageRegions), { wrapper });
    const filterIdToRemove = 999;
    act(() => {
      result.current.onRemoveFilter(filterIdToRemove, true);
    });

    expect(result.current.filters).toEqual([...result.current.allRegionsFilters]);
  });

  it('should filter out region filter from filter config when a user has only one region', () => {
    const u = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    const { result } = renderHook(() => useFilters(
      u,
      filterKey,
      manageRegions,
      [],
      [{ id: 'region' }],
    ), { wrapper });

    expect(result.current.filterConfig).toEqual([]);
  });
  it('does not filter out region filter from filter config when a user has more than one region', () => {
    const u = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }, {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    const { result } = renderHook(() => useFilters(
      u,
      filterKey,
      manageRegions,
      [],
      [{ id: 'region' }],
    ), { wrapper });

    expect(result.current.filterConfig).toEqual([{ id: 'region' }]);
  });
});
