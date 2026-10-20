import { act, renderHook } from '@testing-library/react-hooks';
import useWidgetSorting from '../useWidgetSorting';

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
