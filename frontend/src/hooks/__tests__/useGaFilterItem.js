import { renderHook, act } from '@testing-library/react-hooks';
import useGaFilterItem from '../useGaFilterItem';

describe('useGaFilterItem', () => {
  const onUpdateFilter = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call onUpdateFilter with the correct arguments', () => {
    const filter = {
      id: 1,
      topic: 'topic1',
      condition: 'condition1',
      query: 'query1',
    };

    const { result } = renderHook(() => useGaFilterItem(filter, onUpdateFilter));

    act(() => {
      result.current('name1', 'value1');
    });

    expect(onUpdateFilter).toHaveBeenCalledWith(1, 'name1', 'value1');
  });

  it('should push the correct event to window.dataLayer', () => {
    const filter = {
      id: 1,
      topic: 'topic1',
      condition: 'condition1',
      query: 'query1',
    };

    const { result } = renderHook(() => useGaFilterItem(filter, onUpdateFilter));

    const mockDataLayerPush = jest.fn();

    global.window.dataLayer = {
      push: mockDataLayerPush,
    };

    act(() => {
      result.current('name1', 'value1');
    });

    expect(mockDataLayerPush).toHaveBeenCalledWith({
      event: 'filterSelection',
      value: 'value1',
      topic: 'topic1',
      condition: 'condition1',
      query: 'query1',
      name1: 'value1',
    });
  });

  it('should handle errors when sending filter data to Google Analytics', () => {
    const filter = {
      id: 1,
      topic: 'topic1',
      condition: 'condition1',
      query: 'query1',
    };

    const { result } = renderHook(() => useGaFilterItem(filter, onUpdateFilter));

    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.window.dataLayer = 1;

    act(() => {
      result.current('name1', 'value1');
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error sending filter data to Google Analytics',
      expect.any(Error),
    );
  });
});
