import { useContext, useRef, useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';
import AppLoadingContext from '../AppLoadingContext';

export default function useFetch(
  initialValue,
  fetcher,
  dependencies = [],
  errorMessage = 'An unexpected error occurred',
  useAppLoading = false
) {
  const [data, setData] = useState(initialValue);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setIsAppLoading } = useContext(AppLoadingContext) || {};
  const requestIdRef = useRef(0);

  useDeepCompareEffectNoCheck(() => {
    // Guard against stale responses when multiple fetches overlap.
    // Older requests may resolve after newer ones and should be ignored.
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let cancelled = false;
    const isLatestRequest = () => !cancelled && requestId === requestIdRef.current;

    setLoading(true);

    async function fetchData() {
      try {
        setError('');
        if (useAppLoading && setIsAppLoading) {
          setIsAppLoading(true);
        }
        const response = await fetcher();
        if (!isLatestRequest()) {
          return;
        }
        setData(response);
        setStatusCode(200);
      } catch (err) {
        if (!isLatestRequest()) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error(err);
        setError(errorMessage);
        setStatusCode(err.status || 500);
      } finally {
        if (isLatestRequest()) {
          setLoading(false);
          if (useAppLoading && setIsAppLoading) {
            setIsAppLoading(false);
          }
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
      if (useAppLoading && setIsAppLoading && requestId === requestIdRef.current) {
        setIsAppLoading(false);
      }
    };
  }, dependencies);

  return {
    data,
    setData,
    error,
    statusCode,
    loading,
  };
}
