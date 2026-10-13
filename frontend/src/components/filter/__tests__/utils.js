import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { CommunicationLogUsersContext } from '../../CommunicationLogUsersProvider';
import { MyGroupsContext } from '../../MyGroupsProvider';
import {
  fixQueryWhetherStringOrArray,
  useDisplayCommunicationLogStaff,
  useDisplayGroups,
} from '../utils';

describe('useDisplayGroups', () => {
  it('returns empty string for empty or no query', () => {
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups: [] }}>{children}</MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups(''), { wrapper });
    expect(result.current).toBe('');
  });

  it('returns group names for valid queries with number IDs', () => {
    const myGroups = [
      { id: 1, name: 'Group1' },
      { id: 2, name: 'Group2' },
    ];
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups }}>{children}</MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups('1'), { wrapper });
    expect(result.current).toBe('Group1');
  });

  it('returns group names for valid queries with string IDs', () => {
    const myGroups = [
      { id: 1, name: 'Group1' },
      { id: 2, name: 'Group2' },
    ];
    const wrapper = ({ children }) => (
      <MyGroupsContext.Provider value={{ myGroups }}>{children}</MyGroupsContext.Provider>
    );
    const { result } = renderHook(() => useDisplayGroups(['2']), { wrapper });
    expect(result.current).toBe('Group2');
  });
});

describe('useDisplayCommunicationLogStaff', () => {
  const users = [
    { id: 1, name: 'Jane Roe' },
    { id: 2, name: 'Sam Poe' },
  ];

  const wrapper = ({ children }) => (
    <CommunicationLogUsersContext.Provider value={{ users }}>
      {children}
    </CommunicationLogUsersContext.Provider>
  );

  it('returns empty string for an empty query', () => {
    const { result } = renderHook(() => useDisplayCommunicationLogStaff([]), { wrapper });
    expect(result.current).toBe('');
  });

  it('returns empty string when no query is provided', () => {
    const { result } = renderHook(() => useDisplayCommunicationLogStaff(undefined), { wrapper });
    expect(result.current).toBe('');
  });

  it('returns the user name for a matching query', () => {
    const { result } = renderHook(() => useDisplayCommunicationLogStaff([1]), { wrapper });
    expect(result.current).toBe('Jane Roe');
  });

  it('returns multiple user names for multiple matching queries', () => {
    const { result } = renderHook(() => useDisplayCommunicationLogStaff([1, 2]), { wrapper });
    expect(result.current).toBe('Jane Roe, Sam Poe');
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
