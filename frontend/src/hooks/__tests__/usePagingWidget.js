import { renderHook } from '@testing-library/react-hooks';
import useWidgetPaging from '../useWidgetPaging';

describe('useWidgetPaging', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    expect(result.current.offset).toEqual(0);
    expect(result.current.activePage).toEqual(1);
    expect(result.current.handlePageChange).toEqual(expect.any(Function));
    expect(result.current.requestSort).toEqual(expect.any(Function));
    expect(result.current.exportRows).toEqual(expect.any(Function));
    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    });
  });

  it('should handle page change', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.handlePageChange(2);

    expect(result.current.activePage).toEqual(2);
    expect(result.current.offset).toEqual(1);
  });

  it('should request sort', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.requestSort('1');

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'asc',
      activePage: 1,
    });
  });

  it('should request sort with desc', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.requestSort('1');

    expect(result.current.sortConfig).toEqual({
      sortBy: '1',
      direction: 'desc',
      activePage: 1,
    });
  });

  it('should request sort with string column', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.requestSort('string_header');

    expect(result.current.sortConfig).toEqual({
      sortBy: 'string_header',
      direction: 'asc',
      activePage: 1,
    });
  });

  it('should request sort with date column', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.requestSort('data_header');

    expect(result.current.sortConfig).toEqual({
      sortBy: 'data_header',
      direction: 'asc',
      activePage: 1,
    });
  });

  it('should request sort with number column', () => {
    const { result } = renderHook(() => useWidgetPaging(
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
      ['data_header'],
    ));

    result.current.requestSort('number_header');

    expect(result.current.sortConfig).toEqual({
      sortBy: 'number_header',
      direction: 'asc',
      activePage: 1,
    });
  });
});
