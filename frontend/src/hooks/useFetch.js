import { useState, useContext, useEffect } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import AppLoadingContext from '../AppLoadingContext';

const FETCH_STATUS = {
  shouldFetch: false,
  fetching: false,
  fetched: false,
};

export default function useFetch(
  initialValue,
  fetcher,
  dependencies = [],
  useLoadingState = false,
  errorMessage = 'An unexpected error occured',
) {
  const [data, setData] = useState(initialValue);
  const [error, setError] = useState('');
  const [fetchStatus, setFetchStatus] = useState(FETCH_STATUS);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    if (useLoadingState && fetchStatus.fetching) {
      setIsAppLoading(true);
    } else if (useLoadingState) {
      setIsAppLoading(false);
    }
  }, [fetchStatus.fetching, setIsAppLoading, useLoadingState]);

  useDeepCompareEffect(() => {
    async function fetchData() {
      try {
        setFetchStatus({ ...fetchStatus, fetching: true });
        const response = await fetcher();
        setData(response);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError(errorMessage);
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

  return {
    data,
    setData,
    error,
    loading: fetchStatus.fetching,
  };
}
