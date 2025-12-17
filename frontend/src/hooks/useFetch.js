import { useState, useContext } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import AppLoadingContext from '../AppLoadingContext';

export default function useFetch(
  initialValue,
  fetcher,
  dependencies = [],
  errorMessage = 'An unexpected error occurred',
  useAppLoading = false,
) {
  const [data, setData] = useState(initialValue);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setIsAppLoading } = useContext(AppLoadingContext) || {};

  useDeepCompareEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[useFetch] Effect triggered, setting loading to true');
    setLoading(true);

    async function fetchData() {
      try {
        setError('');
        if (useAppLoading && setIsAppLoading) {
          setIsAppLoading(true);
        }
        // eslint-disable-next-line no-console
        console.log('[useFetch] Calling fetcher...');
        const response = await fetcher();
        // eslint-disable-next-line no-console
        console.log('[useFetch] Fetcher completed, setting data');
        setData(response);
        setStatusCode(200);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useFetch] Error:', err);
        setError(errorMessage);
        setStatusCode(err.status || 500);
      } finally {
        // eslint-disable-next-line no-console
        console.log('[useFetch] Setting loading to false');
        setLoading(false);
        if (useAppLoading && setIsAppLoading) {
          setIsAppLoading(false);
        }
      }
    }

    fetchData();
  }, [dependencies]);

  return {
    data,
    setData,
    error,
    statusCode,
    loading,
  };
}
