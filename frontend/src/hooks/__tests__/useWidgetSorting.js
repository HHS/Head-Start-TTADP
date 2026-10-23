import { act, renderHook } from '@testing-library/react-hooks';
import useWidgetSorting, { toSortKey } from '../useWidgetSorting';

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
  it('normalizes whitespace, including non-breaking spaces, into sort keys', () => {
    expect(toSortKey('Report\u00a0ID')).toBe('Report_ID');
    expect(toSortKey('Creator name')).toBe('Creator_name');
    expect(toSortKey('Root_cause')).toBe('Root_cause');
    expect(toSortKey(undefined)).toBe('');
  });

  it.each([
    ['spaced columns, underscored request', ['Creator name'], 'Creator_name'],
    ['underscored columns, spaced request', ['Creator_name'], 'Creator name'],
  ])('matches string columns and cells across key formats (%s)', (_, columns, sortBy) => {
    const setDataToUse = jest.fn();
    const rows = ['Charlie', 'alice', 'Bob'].map((name, id) => ({
      id,
      data: [{ title: 'Creator name', value: name }],
    }));

    const { result } = renderHook(() =>
      useWidgetSorting(
        `testKeyFormats-${sortBy}`,
        { sortBy: 'id', direction: 'asc', activePage: 1 },
        rows,
        setDataToUse,
        columns,
        [],
        []
      )
    );

    act(() => {
      result.current.requestSort(sortBy, 'asc');
    });

    expect(setDataToUse.mock.calls.at(-1)[0].map((r) => r.id)).toEqual([1, 2, 0]);
  });

  it('matches cell sortKeys and flat row keys across key formats', () => {
    const setDataToUse = jest.fn();
    const cellRows = [5, 20, 10].map((value, id) => ({
      id,
      data: [{ title: 'Number of reports', sortKey: 'Number_of_reports', value }],
    }));
    const flatRows = [5, 20, 10].map((value, id) => ({ id, 'Days since': value }));

    const { result: cells } = renderHook(() =>
      useWidgetSorting('testCellSortKey', {}, cellRows, setDataToUse, [], [], [])
    );
    act(() => {
      cells.current.requestSort('Number of reports', 'desc');
    });
    expect(setDataToUse.mock.calls.at(-1)[0].map((r) => r.id)).toEqual([1, 2, 0]);

    const { result: flat } = renderHook(() =>
      useWidgetSorting('testFlatRowKey', {}, flatRows, setDataToUse, [], [], [])
    );
    act(() => {
      flat.current.requestSort('Days_since', 'asc');
    });
    expect(setDataToUse.mock.calls.at(-1)[0].map((r) => r.id)).toEqual([0, 2, 1]);
  });

  it('toggles direction when the stored sort key uses the other format', () => {
    const { result } = renderHook(() =>
      useWidgetSorting(
        'testToggleKeyFormat',
        { sortBy: 'Creator name', direction: 'asc', activePage: 1 },
        [],
        jest.fn(),
        [],
        [],
        []
      )
    );

    act(() => {
      result.current.requestSort('Creator_name');
    });

    expect(result.current.sortConfig.direction).toBe('desc');
  });
});
