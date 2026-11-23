import { act, renderHook } from '@testing-library/react-hooks';
import { useHistory } from 'react-router-dom';
import { getReport } from '../../fetchers/activityReports';
import useReadOnlyReportFetch, {
  SIGNED_URL_REFRESH_AFTER_MS,
  SIGNED_URL_REFRESH_CHECK_MS,
} from '../useReadOnlyReportFetch';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
}));
jest.mock('../../fetchers/activityReports');

const match = { params: { activityReportId: '1' } };
const user = { id: 1 };

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
};

describe('useReadOnlyReportFetch', () => {
  let push;

  beforeEach(() => {
    jest.useFakeTimers();
    push = jest.fn();
    useHistory.mockReturnValue({ push });
    setVisibility('visible');
    getReport.mockReset();
    getReport.mockResolvedValue({ id: 1, files: [{ url: { url: 'signed-1' } }] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderAndLoad = async (activityMatch = match) => {
    const rendered = renderHook(() => useReadOnlyReportFetch(activityMatch, user));
    await act(async () => {
      await Promise.resolve();
    });
    return rendered;
  };

  // Advance one check interval at a time, letting promises settle between ticks like
  // real time would, so a refresh resets the staleness clock before the next tick.
  const advance = async (ms) => {
    const steps = Math.ceil(ms / SIGNED_URL_REFRESH_CHECK_MS);
    for (let i = 0; i < steps; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(SIGNED_URL_REFRESH_CHECK_MS);
        await Promise.resolve();
      });
    }
  };

  it('fetches the report on load', async () => {
    const { result } = await renderAndLoad();
    expect(getReport).toHaveBeenCalledTimes(1);
    expect(result.current.id).toBe(1);
  });

  it('redirects to a 404 for an invalid report id', async () => {
    await renderAndLoad({ params: { activityReportId: 'nope' } });
    expect(push).toHaveBeenCalledWith('/something-went-wrong/404');
    expect(getReport).not.toHaveBeenCalled();
  });

  it('redirects when the initial fetch fails', async () => {
    getReport.mockRejectedValue({ status: 403 });
    await renderAndLoad();
    expect(push).toHaveBeenCalledWith('/something-went-wrong/403');
  });

  it('refetches before signed attachment URLs expire', async () => {
    const { result } = await renderAndLoad();
    getReport.mockResolvedValue({ id: 1, files: [{ url: { url: 'signed-2' } }] });

    await advance(SIGNED_URL_REFRESH_AFTER_MS + SIGNED_URL_REFRESH_CHECK_MS);

    expect(getReport).toHaveBeenCalledTimes(2);
    expect(result.current.files[0].url.url).toBe('signed-2');
  });

  it('does not refetch before the refresh window', async () => {
    await renderAndLoad();
    await advance(SIGNED_URL_REFRESH_AFTER_MS - SIGNED_URL_REFRESH_CHECK_MS);
    expect(getReport).toHaveBeenCalledTimes(1);
  });

  it('does not refetch in the background while the page is hidden', async () => {
    await renderAndLoad();
    setVisibility('hidden');
    await advance(SIGNED_URL_REFRESH_AFTER_MS * 2);
    expect(getReport).toHaveBeenCalledTimes(1);
  });

  it('refetches when the page becomes visible with stale links', async () => {
    await renderAndLoad();
    setVisibility('hidden');
    await advance(SIGNED_URL_REFRESH_AFTER_MS * 2);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(getReport).toHaveBeenCalledTimes(2);
  });

  it('keeps the current report and stays on the page when a refresh fails', async () => {
    const { result } = await renderAndLoad();
    getReport.mockRejectedValue({ status: 500 });

    await advance(SIGNED_URL_REFRESH_AFTER_MS + SIGNED_URL_REFRESH_CHECK_MS);

    // A failed refresh isn't recorded as a fetch, so it is retried on the next check.
    expect(getReport.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(push).not.toHaveBeenCalled();
    expect(result.current.files[0].url.url).toBe('signed-1');
  });

  it('stops refreshing after unmount', async () => {
    const { unmount } = await renderAndLoad();
    unmount();
    await advance(SIGNED_URL_REFRESH_AFTER_MS * 2);
    expect(getReport).toHaveBeenCalledTimes(1);
  });
});
