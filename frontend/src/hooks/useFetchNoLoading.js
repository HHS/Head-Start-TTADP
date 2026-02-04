import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';

export default function useFetchNoLoading(
  initialValue,
  fetcher,
  dependencies = [],
  errorMessage = 'An unexpected error occurred',
) {
  const [data, setData] = useState(initialValue);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState(null);

  useDeepCompareEffectNoCheck(() => {
    async function fetchData() {
      try {
        setError('');
        const response = await fetcher();
        setData(response);
        setStatusCode(200);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError(errorMessage);
        setStatusCode(err.status || 500);
      }
    }

    fetchData();
  }, dependencies);

  return {
    data,
    setData,
    error,
    statusCode,
  };
}
