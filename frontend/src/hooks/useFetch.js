import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';

const FETCH_STATUS = {
  shouldFetch: false,
  fetching: false,
  fetched: false,
};

export default function useFetch(initialValue, fetcher, dependencies = []) {
  const [data, setData] = useState(initialValue); // { text: string, citation: string }[]
  const [fetchStatus, setFetchStatus] = useState(FETCH_STATUS);

  useDeepCompareEffect(() => {
    async function fetchData() {
      try {
        setFetchStatus({ ...fetchStatus, fetching: true });
        const response = await fetcher();
        setData(response);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setFetchStatus({ ...fetchStatus, fetching: false, fetched: true });
      }
    }

    if (fetchStatus.shouldFetch && !fetchStatus.fetching && !fetchStatus.fetched) {
      fetchData();
    }
    // eslint-disable-next-line max-len
    if (dependencies.every((dep) => Boolean(dep)) && !fetchStatus.fetching && !fetchStatus.fetched) {
      setFetchStatus({ ...fetchStatus, shouldFetch: true });
    }
  }, [fetchStatus, dependencies]);

  return data;
}
