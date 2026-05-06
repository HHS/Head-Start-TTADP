import { renderHook } from '@testing-library/react-hooks';
import useFetchNoLoading from '../useFetchNoLoading';

describe('useFetchNoLoading', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses err.status when the thrown error has a status property (covers err.status || 500 truthy branch)', async () => {
    const error = new Error('Not Found');
    error.status = 404;
    const fetcher = jest.fn().mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchNoLoading(null, fetcher, [])
    );

    await waitForNextUpdate();

    expect(result.current.statusCode).toBe(404);
    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('sets data and statusCode=200 on successful fetch', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 42 });

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchNoLoading(null, fetcher, [])
    );

    await waitForNextUpdate();

    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.statusCode).toBe(200);
    expect(result.current.error).toBe('');
  });

  it('falls back to statusCode=500 when error has no .status property (covers err.status || 500 falsy branch)', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Generic failure'));

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchNoLoading(null, fetcher, [])
    );

    await waitForNextUpdate();

    expect(result.current.statusCode).toBe(500);
    expect(result.current.error).toBe('An unexpected error occurred');
  });
});
