import { useEffect, useRef } from 'react';

/**
 *
 * Takes a callback and an array of dependencies and debounces the callback
 * (Does not run if already in progress. Runs on a set delay.)
 *
 * usage matches standard useEffect hook
 *
 * Example:
 *
 * useAsyncDebounceEffect(async () => {
 *  await someAsyncFunction();
 *  console.log('done');
 * }
 * , [someDependency], 250);
 *
 * @param {Function} callback function that returns a promise
 * @param {Array[refs]} dependencies as in useEffect
 * @param {Number} delay in milliseconds
 */

const useAsyncDebounceEffect = (
  callback,
  dependencies = [],
  delay = 250,
) => {
  const inProgress = useRef(false);
  useEffect(() => {
    const cb = async () => {
      await callback();
      inProgress.current = false;
    };
    const effect = setTimeout(async () => {
      if (inProgress.current) {
        return;
      }

      inProgress.current = true;
      await cb();
    }, delay);

    return () => clearTimeout(effect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useAsyncDebounceEffect;
