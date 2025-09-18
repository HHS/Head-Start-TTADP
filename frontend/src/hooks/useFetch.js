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

  useDeepCompareEffect(() => {
    async function fetchData() {
      try {
        const response = await fetcher();
        setData(response);
      } catch (err) {
      // eslint-disable-next-line no-console
        console.error(err);
        setError(errorMessage);
      }
    }

    fetchData();
  }, [dependencies]);

  return {
    data,
    setData,
    error,
  };
}
