import { renderHook, act } from '@testing-library/react-hooks';
import usePerPageSortAndOffset from '../usePerPageSortAndOffset';

describe('usePerPageSortAndOffset', () => {
  const sessionSortKey = 'testSortKey';
  const defaultSort = { sortBy: 'createdOn', direction: 'desc' };
  const defaultPerPage = 10;
  const defaultOffset = 0;

  it('should initialize with default values', () => {
    // eslint-disable-next-line max-len
    const { result } = renderHook(() => usePerPageSortAndOffset(sessionSortKey, defaultSort, defaultPerPage, defaultOffset));

    expect(result.current.perPage).toBe(defaultPerPage);
    expect(result.current.activePage).toBe(1);
    expect(result.current.direction).toBe('desc');
    expect(result.current.sortBy).toBe('createdOn');

    // Test handlePageChange
    act(() => {
      result.current.handlePageChange(2);
    });
    expect(result.current.activePage).toBe(2);
    expect(result.current.sortBy).toBe('createdOn');
    expect(result.current.direction).toBe('desc');

    // Test requestSort
    act(() => {
      result.current.requestSort('name');
    });
    expect(result.current.sortBy).toBe('name');
    expect(result.current.direction).toBe('asc');
    act(() => {
      result.current.requestSort('name');
    });
    expect(result.current.sortBy).toBe('name');
    expect(result.current.direction).toBe('desc');

    // Test perPageChange
    act(() => {
      result.current.perPageChange({ target: { value: '20' } });
    });

    expect(result.current.perPage).toBe(20);
    expect(result.current.activePage).toBe(1);
    expect(result.current.sortBy).toBe('name');
    expect(result.current.direction).toBe('desc');
  });
});
