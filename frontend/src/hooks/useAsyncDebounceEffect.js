import { useEffect, useRef } from 'react';

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
