import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { MyGroupsContext } from '../../MyGroupsProvider';
import { fixQueryWhetherStringOrArray, useDisplayGroups } from '../utils';

describe('useDisplayGroups', () => {
  it('returns empty string for empty or no query', () => {
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups: [] }}>
        {children}
      </MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups(''), { wrapper });
    expect(result.current).toBe('');
  });

  it('returns group names for valid queries with number IDs', () => {
    const myGroups = [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }];
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups }}>
        {children}
      </MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups('1'), { wrapper });
    expect(result.current).toBe('Group1');
  });

  it('returns group names for valid queries with string IDs', () => {
    const myGroups = [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }];
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups }}>
        {children}
      </MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups(['2']), { wrapper });
    expect(result.current).toBe('Group2');
  });
});

describe('fixQueryWhetherStringOrArray', () => {
  it('returns same string for string input', () => {
    const query = 'testQuery';
    expect(fixQueryWhetherStringOrArray(query)).toBe('testQuery');
  });

  it('returns comma-separated string for array input', () => {
    const query = ['test1', 'test2'];
    expect(fixQueryWhetherStringOrArray(query)).toBe('test1, test2');
  });
});
