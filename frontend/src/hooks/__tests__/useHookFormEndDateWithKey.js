import { renderHook, act } from '@testing-library/react-hooks';
import { useFormContext } from 'react-hook-form';
import useHookFormEndDateWithKey from '../useHookFormEndDateWithKey';

jest.mock('react-hook-form', () => ({
  useFormContext: jest.fn(),
}));

describe('useHookFormEndDateWithKey', () => {
  let mockSetValue;

  beforeEach(() => {
    mockSetValue = jest.fn();
    useFormContext.mockReturnValue({
      setValue: mockSetValue,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default endDateKey', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    expect(result.current.endDateKey).toBe('endDate');
    expect(typeof result.current.setEndDateKey).toBe('function');
    expect(typeof result.current.setEndDate).toBe('function');
  });

  it('should call setValue with correct parameters when setEndDate is called', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    const newDate = '2023-12-25';

    act(() => {
      result.current.setEndDate(newDate);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', newDate);
  });

  it('should update endDateKey when setEndDate is called', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    const newDate = '2023-12-25';

    act(() => {
      result.current.setEndDate(newDate);
    });

    expect(result.current.endDateKey).toBe('endDate-2023-12-25');
  });

  it('should handle multiple calls to setEndDate with different dates', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    const firstDate = '2023-01-01';
    const secondDate = '2023-12-31';

    act(() => {
      result.current.setEndDate(firstDate);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', firstDate);
    expect(result.current.endDateKey).toBe('endDate-2023-01-01');

    act(() => {
      result.current.setEndDate(secondDate);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', secondDate);
    expect(result.current.endDateKey).toBe('endDate-2023-12-31');
    expect(mockSetValue).toHaveBeenCalledTimes(2);
  });

  it('should handle null or undefined date values', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    act(() => {
      result.current.setEndDate(null);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', null);
    expect(result.current.endDateKey).toBe('endDate-null');

    act(() => {
      result.current.setEndDate(undefined);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', undefined);
    expect(result.current.endDateKey).toBe('endDate-undefined');
  });

  it('should handle empty string date values', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    act(() => {
      result.current.setEndDate('');
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', '');
    expect(result.current.endDateKey).toBe('endDate-');
  });

  it('should allow direct manipulation of endDateKey via setEndDateKey', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    const customKey = 'custom-end-date-key';

    act(() => {
      result.current.setEndDateKey(customKey);
    });

    expect(result.current.endDateKey).toBe(customKey);
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it('should maintain stable function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useHookFormEndDateWithKey());

    const initialSetEndDate = result.current.setEndDate;
    const initialSetEndDateKey = result.current.setEndDateKey;

    rerender();

    expect(result.current.setEndDate).toBe(initialSetEndDate);
    expect(result.current.setEndDateKey).toBe(initialSetEndDateKey);
  });

  it('should handle Date objects as input', () => {
    const { result } = renderHook(() => useHookFormEndDateWithKey());

    const dateObject = new Date('2023-06-15');

    act(() => {
      result.current.setEndDate(dateObject);
    });

    expect(mockSetValue).toHaveBeenCalledWith('endDate', dateObject);
    expect(result.current.endDateKey).toBe(`endDate-${dateObject}`);
  });
});
