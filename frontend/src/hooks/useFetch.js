import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';

export default function useFetch(
  initialValue,
  fetcher,
  dependencies = [],
  errorMessage = 'An unexpected error occured',
) {
  const [data, setData] = useState(initialValue);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState(null);

  useDeepCompareEffect(() => {
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
  }, [dependencies]);

  return {
    data,
    setData,
    error,
    statusCode,
  };
}
