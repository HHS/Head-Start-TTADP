import { act, renderHook } from '@testing-library/react-hooks';
import useSessionSort from '../useSessionSort';
import useWidgetSorting from '../useWidgetSorting';

describe('useSessionSort pagination validation', () => {
  const storageKey = '-testSessionSorting-sorting';
  const defaultSort = {
    sortBy: 'name',
    direction: 'asc',
    activePage: 2,
    offset: 10,
    perPage: 10,
  };

  beforeEach(() => {
    window.sessionStorage.setItem('', '[]');
  });

  afterEach(() => {
    window.sessionStorage.removeItem('');
    window.sessionStorage.removeItem(storageKey);
  });

  it.each([
    undefined,
    null,
    'invalid',
    '3',
    '3items',
    '',
    true,
    {},
    [],
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('falls back to defaults for invalid pagination %p', (value) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ ...defaultSort, activePage: value, offset: value })
    );

    const { result } = renderHook(() => useSessionSort(defaultSort, 'testSessionSorting'));

    expect(result.current[0]).toEqual(defaultSort);
  });

  it.each([
    [1, 0],
    [3, 20],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ])('restores valid page %p and offset %p', (activePage, offset) => {
    const storedSort = { ...defaultSort, activePage, offset };
    window.sessionStorage.setItem(storageKey, JSON.stringify(storedSort));

    const { result } = renderHook(() => useSessionSort(defaultSort, 'testSessionSorting'));

    expect(result.current[0]).toEqual(storedSort);
  });

  it('rejects page zero while preserving offset zero', () => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ ...defaultSort, activePage: 0, offset: 0 })
    );

    const { result } = renderHook(() => useSessionSort(defaultSort, 'testSessionSorting'));

    expect(result.current[0]).toEqual({ ...defaultSort, offset: 0 });
  });

  it('leaves invalid pagination undefined when defaults omit it', () => {
    const sortWithoutPagination = { sortBy: 'name', direction: 'asc' };
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ ...sortWithoutPagination, activePage: 'invalid', offset: 'invalid' })
    );

    const { result } = renderHook(() =>
      useSessionSort(sortWithoutPagination, 'testSessionSorting')
    );

    expect(result.current[0]).toEqual({
      ...sortWithoutPagination,
      activePage: undefined,
      offset: undefined,
    });
  });
});

describe('useWidgetSorting', () => {
  it('should initialize with default values', async () => {
    const { result } = renderHook(() =>
      useWidgetSorting(
        'testSorting',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        [],
        jest.fn()
      )
    );

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    });
  });

  it('should request sort', async () => {
    const setDataToUse = jest.fn();

    const { result } = renderHook(() =>
      useWidgetSorting(
        'testSorting',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        [],
        setDataToUse
      )
    );

    const { requestSort } = result.current;
    act(() => {
      requestSort('1', 'asc');
    });

    expect(setDataToUse).toHaveBeenCalledWith([]);
    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 });
  });

  it('should sort by string', () => {
    const setDataToUse = jest.fn();

    const { result } = renderHook(() =>
      useWidgetSorting(
        'testSorting',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        [],
        setDataToUse,
        ['1']
      )
    );

    const { requestSort } = result.current;
    act(() => {
      requestSort('1', 'asc');
    });

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 });
  });

  it('should sort by date', () => {
    const setDataToUse = jest.fn();

    const { result } = renderHook(() =>
      useWidgetSorting(
        'testSorting',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        [],
        setDataToUse,
        [],
        ['1'],
        []
      )
    );

    const { requestSort } = result.current;
    act(() => {
      requestSort('1', 'asc');
    });

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 });
  });

  it('sorts by a date that is not in the first cell', () => {
    const setDataToUse = jest.fn();
    const row = (id, date) => ({
      id,
      data: [
        { title: 'Recipient', value: `Recipient ${id}` },
        { title: 'Created date', value: date },
      ],
    });
    const rows = [row(1, '01/15/2026'), row(2, '03/01/2026'), row(3, '02/10/2026')];

    const { result } = renderHook(() =>
      useWidgetSorting(
        'testDateSorting',
        { sortBy: 'Created date', direction: 'desc', activePage: 1 },
        rows,
        setDataToUse,
        [],
        ['Created date'],
        []
      )
    );

    act(() => {
      result.current.requestSort('Created date', 'desc');
    });

    expect(setDataToUse.mock.calls.at(-1)[0].map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it('should sort by key', () => {
    const setDataToUse = jest.fn();

    const { result } = renderHook(() =>
      useWidgetSorting(
        'testSorting',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        [],
        setDataToUse,
        [],
        [],
        ['1']
      )
    );

    const { requestSort } = result.current;
    act(() => {
      requestSort('1', 'asc');
    });

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 });
  });
});
