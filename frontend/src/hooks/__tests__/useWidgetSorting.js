import { renderHook, act } from '@testing-library/react-hooks'
import useWidgetSorting from '../useWidgetSorting'

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
    )

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    })
  })

  it('should request sort', async () => {
    const setDataToUse = jest.fn()

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
    )

    const { requestSort } = result.current
    act(() => {
      requestSort('1', 'asc')
    })

    expect(setDataToUse).toHaveBeenCalledWith([])
    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 })
  })

  it('should sort by string', () => {
    const setDataToUse = jest.fn()

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
    )

    const { requestSort } = result.current
    act(() => {
      requestSort('1', 'asc')
    })

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 })
  })

  it('should sort by date', () => {
    const setDataToUse = jest.fn()

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
    )

    const { requestSort } = result.current
    act(() => {
      requestSort('1', 'asc')
    })

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 })
  })

  it('should sort by key', () => {
    const setDataToUse = jest.fn()

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
    )

    const { requestSort } = result.current
    act(() => {
      requestSort('1', 'asc')
    })

    expect(result.current.sortConfig).toEqual({ sortBy: '1', direction: 'asc', activePage: 1 })
  })
})
