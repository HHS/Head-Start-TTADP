import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import useFetch from '../useFetch';
import AppLoadingContext from '../../AppLoadingContext';

describe('useFetch', () => {
  it('should start with loading true on initial mount', () => {
    const mockFetcher = jest.fn(() => Promise.resolve({ data: 'test' }));

    const { result } = renderHook(() => useFetch(
      null,
      mockFetcher,
      [],
      'Error message',
    ));

    expect(result.current.loading).toBe(true);
  });

  it('should set loading to false after successful fetch', async () => {
    const mockFetcher = jest.fn(() => Promise.resolve({ data: 'test' }));

    const { result, waitForNextUpdate } = renderHook(() => useFetch(
      null,
      mockFetcher,
      [],
      'Error message',
    ));

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ data: 'test' });
    expect(result.current.error).toBe('');
    expect(result.current.statusCode).toBe(200);
  });

  it('should reset loading to true when dependencies change', async () => {
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' });

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ deps }) => useFetch(null, mockFetcher, deps, 'Error'),
      { initialProps: { deps: [{ filter: 'value1' }] } },
    );

    // Wait for first fetch to complete
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ data: 'first' });

    // Change dependencies - THIS IS WHERE THE BUG WAS
    rerender({ deps: [{ filter: 'value2' }] });

    // Loading should be true again immediately after dependency change
    expect(result.current.loading).toBe(true);

    // Wait for second fetch to complete
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ data: 'second' });
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('should handle rapid dependency changes correctly', async () => {
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' })
      .mockResolvedValueOnce({ data: 'third' });

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ deps }) => useFetch(null, mockFetcher, deps, 'Error'),
      { initialProps: { deps: [{ filter: 'value1' }] } },
    );

    // Wait for first fetch
    await waitForNextUpdate();

    // Rapidly change dependencies
    rerender({ deps: [{ filter: 'value2' }] });
    await waitForNextUpdate();

    rerender({ deps: [{ filter: 'value3' }] });
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    // Should have called fetcher for each dependency change
    expect(mockFetcher).toHaveBeenCalledTimes(3);
  });

  it('should set loading to false after fetch error', async () => {
    const mockError = new Error('Network error');
    mockError.status = 500;
    const mockFetcher = jest.fn(() => Promise.reject(mockError));

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result, waitForNextUpdate } = renderHook(() => useFetch(
      null,
      mockFetcher,
      [],
      'Custom error message',
    ));

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Custom error message');
    expect(result.current.statusCode).toBe(500);

    consoleSpy.mockRestore();
  });

  it('should clear error on dependency change and successful retry', async () => {
    const mockError = new Error('Network error');
    mockError.status = 500;
    const mockFetcher = jest.fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ data: 'success' });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ deps }) => useFetch(null, mockFetcher, deps, 'Error occurred'),
      { initialProps: { deps: [{ filter: 'value1' }] } },
    );

    // Wait for error
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Error occurred');

    // Retry with new dependencies
    rerender({ deps: [{ filter: 'value2' }] });
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toEqual({ data: 'success' });

    consoleSpy.mockRestore();
  });

  it('should call setIsAppLoading when useAppLoading is true', async () => {
    const mockSetIsAppLoading = jest.fn();
    const mockFetcher = jest.fn(() => Promise.resolve({ data: 'test' }));

    const wrapper = ({ children }) => (
      <AppLoadingContext.Provider value={{ setIsAppLoading: mockSetIsAppLoading }}>
        {children}
      </AppLoadingContext.Provider>
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useFetch(null, mockFetcher, [], 'Error', true),
      { wrapper },
    );

    // Should call with true at start
    expect(mockSetIsAppLoading).toHaveBeenCalledWith(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    // Should call with false at end
    expect(mockSetIsAppLoading).toHaveBeenCalledWith(false);
  });

  it('should reset app loading state on dependency change', async () => {
    const mockSetIsAppLoading = jest.fn();
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' });

    const wrapper = ({ children }) => (
      <AppLoadingContext.Provider value={{ setIsAppLoading: mockSetIsAppLoading }}>
        {children}
      </AppLoadingContext.Provider>
    );

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ deps }) => useFetch(null, mockFetcher, deps, 'Error', true),
      { wrapper, initialProps: { deps: [{ filter: 'value1' }] } },
    );

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);

    mockSetIsAppLoading.mockClear();

    // Change dependencies
    rerender({ deps: [{ filter: 'value2' }] });

    // Should call setIsAppLoading(true) again
    expect(mockSetIsAppLoading).toHaveBeenCalledWith(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(mockSetIsAppLoading).toHaveBeenCalledWith(false);
  });

  it('should run once on mount when empty dependencies provided', async () => {
    const mockFetcher = jest.fn(() => Promise.resolve({ data: 'test' }));

    const { result, rerender, waitForNextUpdate } = renderHook(() => useFetch(
      null,
      mockFetcher,
      [], // empty dependencies
      'Error',
    ));

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // Rerender shouldn't trigger another fetch
    rerender();

    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should allow manual data updates via setData', async () => {
    const mockFetcher = jest.fn(() => Promise.resolve({ data: 'initial' }));

    const { result, waitForNextUpdate } = renderHook(() => useFetch(
      null,
      mockFetcher,
      [],
      'Error',
    ));

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ data: 'initial' });

    // Manually update data
    act(() => {
      result.current.setData({ data: 'updated' });
    });

    expect(result.current.data).toEqual({ data: 'updated' });
  });
});
