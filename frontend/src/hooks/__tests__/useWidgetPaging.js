import { renderHook, act } from '@testing-library/react-hooks'
import useWidgetPaging, { parseValue } from '../useWidgetPaging'

describe('useWidgetPaging', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        1,
        [],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn() // setDataPerPage
        // stringColumns and dateColumns omitted to test defaults
      )
    )

    expect(result.current.offset).toEqual(0)
    expect(result.current.activePage).toEqual(1)
    expect(result.current.handlePageChange).toEqual(expect.any(Function))
    expect(result.current.requestSort).toEqual(expect.any(Function))
    expect(result.current.exportRows).toEqual(expect.any(Function))
    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    })
  })

  it('should handle page change', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        1,
        [],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['data_header']
      )
    )

    act(() => {
      result.current.handlePageChange(2)
    })

    expect(result.current.activePage).toEqual(2)
    expect(result.current.offset).toEqual(1)
  })

  it('should request sort', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'desc',
          activePage: 1,
        },
        1,
        [],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['data_header']
      )
    )

    act(() => {
      result.current.requestSort('1')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'asc',
      activePage: 1,
    })
  })

  it('should request sort with desc', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'asc',
          activePage: 1,
        },
        1,
        [],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['data_header']
      )
    )

    act(() => {
      result.current.requestSort('1')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    })
  })

  it('should request sort with string column', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'asc',
          activePage: 1,
        },
        1,
        [
          {
            heading: 'test',
            data: [
              {
                title: 'number_header',
                value: '1',
              },
              {
                title: 'string_header',
                value: 'test',
              },
              {
                title: 'number_header',
                value: '2020-01-01',
              },
            ],
          },
        ],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['data_header']
      )
    )

    act(() => {
      result.current.requestSort('string_header')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: 'string_header',
      direction: 'asc',
      activePage: 1,
    })
  })

  it('should request sort with date column', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'date_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'asc',
          activePage: 1,
        },
        1,
        [
          {
            heading: 'test',
            data: [
              {
                title: 'string_header',
                value: 'this is a string value',
              },
              {
                title: 'date_header',
                value: '2020-01-01',
              },
              {
                title: 'number_header',
                value: '2',
              },
            ],
          },
        ],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['date_header']
      )
    )

    act(() => {
      result.current.requestSort('date_header')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: 'date_header',
      direction: 'asc',
      activePage: 1,
    })
  })

  it('should request sort with number column', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'data_header', 'number_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'asc',
          activePage: 1,
        },
        1,
        [
          {
            heading: 'test',
            data: [
              {
                title: 'string_header',
                value: 'this is a string value',
              },
              {
                title: 'date_header',
                value: '2020-01-01',
              },
              {
                title: 'number_header',
                value: '2',
              },
            ],
          },
        ],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['data_header']
      )
    )

    act(() => {
      result.current.requestSort('number_header')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: 'number_header',
      direction: 'asc',
      activePage: 1,
    })
  })

  it('should request sort with value column', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        ['string_header', 'date_header', 'value_header'],
        'testPaging',
        {
          sortBy: '1',
          direction: 'asc',
          activePage: 1,
        },
        1,
        [
          {
            heading: 'test',
            data: [
              {
                title: 'string_header',
                value: 'this is a string value',
              },
              {
                title: 'date_header',
                value: '2020-01-01',
              },
              {
                title: 'value_header',
                value: 'some value',
              },
            ],
          },
        ],
        jest.fn(),
        false,
        jest.fn(),
        false,
        [],
        'RecipientsWithNoTta',
        jest.fn(),
        ['string_header'],
        ['date_header']
      )
    )

    act(() => {
      result.current.requestSort('value_header')
    })

    expect(result.current.sortConfig).toEqual({
      sortBy: 'value_header',
      direction: 'asc',
      activePage: 1,
    })
  })

  it('resets pagination when resetPagination is true', () => {
    const setResetPagination = jest.fn()
    const { result, rerender } = renderHook(
      ({ resetPagination }) =>
        useWidgetPaging(
          [],
          'testPaging',
          { sortBy: '1', direction: 'desc', activePage: 2 },
          10,
          [],
          jest.fn(),
          resetPagination,
          setResetPagination,
          false,
          [],
          'TestExport',
          jest.fn(),
          [],
          [],
          'TestName',
          null,
          []
        ),
      { initialProps: { resetPagination: false } }
    )

    // initial state check
    expect(result.current.activePage).toBe(2)
    expect(result.current.offset).toBe(10)

    // trigger reset
    act(() => {
      rerender({ resetPagination: true })
    })

    // check if reset happened
    expect(result.current.activePage).toBe(1)
    expect(result.current.offset).toBe(0)
    expect(setResetPagination).toHaveBeenCalledWith(false)
  })

  it('does not handle page change when loading', () => {
    const { result } = renderHook(() =>
      useWidgetPaging(
        [],
        'testPaging',
        { sortBy: '1', direction: 'desc', activePage: 1 },
        10,
        [],
        jest.fn(),
        false,
        jest.fn(),
        true,
        [],
        'TestExport',
        jest.fn(),
        [],
        [],
        'TestName',
        null,
        []
      )
    )

    act(() => {
      result.current.handlePageChange(3)
    })

    // page should not change because loading is true
    expect(result.current.activePage).toBe(1)
    expect(result.current.offset).toBe(0)
  })

  describe('parseValue', () => {
    it('works', () => {
      const value = parseValue('100,000')
      expect(value).toEqual(100000)
    })

    it('returns the value is provided is NaN after parsing', () => {
      const value = parseValue('nan')
      expect(value).toEqual('nan')
    })
  })
})
